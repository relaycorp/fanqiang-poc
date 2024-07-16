import { Duplex } from 'node:stream';
import { filter, map, pipeline, writeToStream } from 'streaming-iterables';
import { createWebSocketStream, WebSocket, WebSocketServer } from 'ws';

import { TunInterface } from './TunInterface.js';
import { Ipv4Address } from './ip/ipv4/Ipv4Address.js';
import { initPacket } from './ip/packets.js';
import { Ipv4OrIpv6Packet } from './ip/Ipv4OrIpv6Packet.js';
import { IpPacketValidation } from './ip/IpPacketValidation.js';
import { Ipv6Packet } from './ip/ipv6/Ipv6Packet.js';
import { ForwardingSide } from './nat/ForwardingSide.js';

// TODO: Retrieve using `os.networkInterfaces()`
const GATEWAY_IPV4_ADDRESS = '10.0.0.2';

const server = new WebSocketServer({ host: '127.0.0.1', port: 8080 });

// TODO: Should we allocate each process to a different TUN interface?
const tunInterface = await TunInterface.open();

async function shutDown() {
  console.log('Shutting down');

  server.close();

  // TODO: Fix this close() as it's causing the process to hang when exiting
  await tunInterface.close();
}

process.on('SIGINT', shutDown);

const gatewayIpv4Address = Ipv4Address.fromString(GATEWAY_IPV4_ADDRESS);

function isPacket(packet: Ipv4OrIpv6Packet | null): packet is Ipv4OrIpv6Packet {
  return packet !== null;
}

function forwardPacketsFromTunnel(
  wsStream: Duplex,
  wsClient: WebSocket,
  tunWriteStream: (packets: AsyncIterable<Ipv4OrIpv6Packet>) => Promise<void>,
) {
  return pipeline(
    () => wsStream,
    map((packetBuffer) => {
      let packet: Ipv4OrIpv6Packet;
      try {
        packet = initPacket(packetBuffer);
      } catch (err: any) {
        console.error('Error parsing IP packet:', err);
        wsClient.close(4000, `Invalid IP packet: ${err.message}`);
        return null;
      }

      if (packet instanceof Ipv6Packet) {
        // TODO: Add IPv6 support
        console.log('✖ T→I: Unsupported IPv6 packet');
        return null;
      }

      const ipPacketValidation = packet.validate();
      if (ipPacketValidation === IpPacketValidation.VALID) {
        packet.prepareForForwarding(ForwardingSide.SOURCE, gatewayIpv4Address);

        console.log(`✔ T→I: ${packet}`);
      } else {
        console.log(`✖ T→I: ${packet} (error: ${ipPacketValidation})`);
        return null;
      }

      return packet;
    }),
    filter(isPacket),
    tunWriteStream,
  );
}

function forwardPacketsFromInternet(
  wsStream: Duplex,
  tunReadStream: AsyncIterable<Ipv4OrIpv6Packet>,
) {
  // TODO: Restore the client's IP address

  // TODO: Check that the pipe ends when the client disconnects
  return pipeline(
    () => tunReadStream,
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

      return packet.buffer;
    }),
    filter((packet): packet is Buffer => packet !== null),
    writeToStream(wsStream),
  );
}

server.on('connection', async (wsClient: WebSocket) => {
  console.log('Client connected');

  const wsStream = createWebSocketStream(wsClient);

  const tunWriteStream = tunInterface.createWriter();
  const tunReadStream = tunInterface.createReader();

  try {
    await Promise.all([
      forwardPacketsFromTunnel(wsStream, wsClient, tunWriteStream),
      forwardPacketsFromInternet(wsStream, tunReadStream),
    ]);
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
