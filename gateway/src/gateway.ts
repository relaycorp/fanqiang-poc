import { Duplex } from 'node:stream';
import { filter, map, pipeline } from 'streaming-iterables';
import { createWebSocketStream, WebSocket, WebSocketServer } from 'ws';

import { TunInterface } from './TunInterface.js';
import { Ipv4Address } from './protocolDataUnits/ipv4/Ipv4Address.js';
import { initPacket } from './protocolDataUnits/packets.js';
import { Ipv4Or6Packet } from './protocolDataUnits/Ipv4Or6Packet.js';
import { IpPacketValidation } from './protocolDataUnits/IpPacketValidation.js';
import { Ipv6Packet } from './protocolDataUnits/ipv6/Ipv6Packet.js';
import { Ipv6Address } from './protocolDataUnits/ipv6/Ipv6Address.js';
import { Nat } from './nat/Nat.js';
import type { TunnelConnection } from './nat/TunnelConnection.js';
import { WebsocketTunnel } from './tunnel/WebsocketTunnel.js';

// TODO: Retrieve using `os.networkInterfaces()`
const GATEWAY_IPV4_ADDRESS = '10.0.0.2';

const WS_SERVER = new WebSocketServer({ host: '127.0.0.1', port: 8080 });
const NAT = new Nat(
  Ipv4Address.fromString(GATEWAY_IPV4_ADDRESS),
  Ipv6Address.fromString('0:0:0:0:0:0:0:0'), // TODO: Support IPv6
);

// TODO: Should we allocate each process to a different TUN interface?
const tunInterface = await TunInterface.open();

async function shutDown() {
  console.log('Shutting down');

  WS_SERVER.close();

  // TODO: Fix this close() as it's causing the process to hang when exiting
  // Try https://github.com/mafintosh/why-is-node-running
  await tunInterface.close();
}

process.on('SIGINT', shutDown);

function isPacket(packet: Ipv4Or6Packet | null): packet is Ipv4Or6Packet {
  return packet !== null;
}

function forwardPacketsFromTunnel(
  wsStream: Duplex,
  tunnelConnection: TunnelConnection,
  tunWriteStream: (packets: AsyncIterable<Ipv4Or6Packet>) => Promise<void>,
) {
  return pipeline(
    () => wsStream,
    map((packetBuffer) => {
      let packet: Ipv4Or6Packet;
      try {
        packet = initPacket(packetBuffer);
      } catch (err: any) {
        console.error('Error parsing IP packet:', err);
        return null;
      }

      if (packet instanceof Ipv6Packet) {
        // TODO: Add IPv6 support
        console.log('✖ T→I: Unsupported IPv6 packet');
        return null;
      }

      const ipPacketValidation = packet.validate();
      if (ipPacketValidation === IpPacketValidation.VALID) {
        console.log(`✔ T→I: ${packet}`);
        return packet;
      }

      console.log(`✖ T→I: ${packet} (error: ${ipPacketValidation})`);
      return null;
    }),
    filter(isPacket),
    NAT.forwardPacketsFromTunnel(tunnelConnection),
    map((result) => {
      if (result.didSucceed) {
        return result.result;
      }

      console.error('Error forwarding packet:', result.context);
      return null;
    }),
    filter(isPacket),
    tunWriteStream,
  );
}

WS_SERVER.on('connection', async (wsClient: WebSocket, wsRequest) => {
  console.log('Client connected');

  const wsStream = createWebSocketStream(wsClient);

  const tunWriteStream = tunInterface.createWriter();

  const tunnelConnection = new WebsocketTunnel(
    wsClient,
    wsRequest.socket.remoteAddress!,
    wsRequest.socket.remotePort!,
  );

  try {
    await forwardPacketsFromTunnel(wsStream, tunnelConnection, tunWriteStream);
  } catch (err: any) {
    if (err.code !== 'EIO' && err.syscall) {
      console.error('Failed to communicate with TUN device', err);
    } else {
      console.error('Failed to forward packets', err);
    }
    await shutDown();
    throw new Error('Failed to forward packets', { cause: err });
  }
});

console.log('Server started on port 8080');

// TODO: Check that the pipe ends when the client disconnects
await pipeline(
  () => tunInterface.createReader(),
  map((packet) => {
    if (packet instanceof Ipv6Packet) {
      console.error('✖ I→T: Unsupported IPv6 packet');
      return null;
    }

    const ipPacketValidation = packet.validate();
    if (ipPacketValidation === IpPacketValidation.VALID) {
      console.log(`✔ I→T: ${packet}`);
    } else {
      console.log(`✖ I→T: ${packet} (error: ${ipPacketValidation})`);
      return null;
    }

    return packet;
  }),
  filter(isPacket),
  NAT.forwardPacketsFromInternet(),
);