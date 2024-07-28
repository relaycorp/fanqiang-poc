import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { createWebSocketStream, WebSocket, WebSocketServer } from 'ws';
import { filter, map, pipeline, writeToStream } from 'streaming-iterables';

import { TunInterfacePool } from './tun/TunInterfacePool.js';
import { WebsocketTunnel } from './tunnel/WebsocketTunnel.js';
import { TunInterface } from './tun/TunInterface.js';
import { Ipv4Or6Packet } from './ip/Ipv4Or6Packet.js';
import { TunnelConnection } from './nat/TunnelConnection.js';
import { initPacket } from './ip/packets.js';
import { Ipv6Packet } from './ip/ipv6/Ipv6Packet.js';
import { IpPacketValidation } from './ip/IpPacketValidation.js';

const TUN_INTERFACE_COUNT = 5;
const tunPool = new TunInterfacePool(TUN_INTERFACE_COUNT);

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

      if (packet.getDestinationAddress().isPrivate()) {
        console.log(`✖ T→I: ${packet} (Destination is private address)`);
        return null;
      }

      const ipPacketValidation = packet.validate();
      if (ipPacketValidation === IpPacketValidation.VALID) {
        console.log(`✔ T→I: ${packet}`);
        tunnelConnection.routePacketToInternet(packet);
        return packet;
      }

      console.log(`✖ T→I: ${packet} (error: ${ipPacketValidation})`);
      return null;
    }),
    filter(isPacket),
    tunWriteStream,
  );
}

async function forwardPacketsFromInternet(
  tunReader: AsyncIterable<Ipv4Or6Packet>,
  tunnelConnection: TunnelConnection,
  wsStream: Duplex,
) {
  return pipeline(
    () => tunReader,
    map((packet) => {
      if (packet instanceof Ipv6Packet) {
        // TODO: Add IPv6 support
        console.log('✖ T→I: Unsupported IPv6 packet');
        return null;
      }

      if (packet.getSourceAddress().isPrivate()) {
        console.log(`✖ I→T: ${packet} (Source is private address)`);
        return null;
      }

      const ipPacketValidation = packet.validate();
      if (ipPacketValidation === IpPacketValidation.VALID) {
        const routingSucceeded =
          tunnelConnection.routePacketFromInternet(packet);
        if (routingSucceeded) {
          console.log(`✔ I→T: ${packet}`);
        } else {
          console.log(`✖ I→T: ${packet} (error: NAT mapping not found)`);
          return null;
        }
      } else {
        console.log(`✖ I→T: ${packet} (error: ${ipPacketValidation})`);
        return null;
      }
      return packet.buffer;
    }),
    filter((packetBuffer): packetBuffer is Buffer => packetBuffer !== null),
    writeToStream(wsStream),
  );
}

async function handleConnection(
  wsClient: WebSocket,
  wsRequest: IncomingMessage,
) {
  let tunInterface: TunInterface;
  try {
    tunInterface = await tunPool.allocateInterface();
  } catch (err) {
    console.error('Failed to allocate TUN interface:', err);
    wsClient.close(1013, 'No available TUN interfaces');
    return;
  }

  wsClient.on('close', async () => {
    // TODO: Fix this close() as it's causing the process to hang when exiting
    // Try https://github.com/mafintosh/why-is-node-running
    await tunInterface.close();

    tunPool.releaseInterface(tunInterface);
  });

  const tunnel = new WebsocketTunnel(
    wsClient,
    wsRequest.socket.remoteAddress!,
    wsRequest.socket.remotePort!,
    tunInterface,
  );

  const wsStream = createWebSocketStream(wsClient);
  const tunReader = tunInterface.createReader();
  const tunWriter = tunInterface.createWriter();
  wsClient.send(tunInterface.subnet);
  await Promise.all([
    forwardPacketsFromTunnel(wsStream, tunnel, tunWriter),
    forwardPacketsFromInternet(tunReader, tunnel, wsStream),
  ]);
}

async function runServer() {
  const server = new WebSocketServer({ host: '127.0.0.1', port: 8080 });

  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    server.close(() => {
      console.log('WebSocket server closed');
      process.exit(0);
    });
  });

  server.on('connection', handleConnection);

  server.on('listening', () => {
    console.log('WebSocket server started on ws://127.0.0.1:8080');
  });
}

await runServer();
