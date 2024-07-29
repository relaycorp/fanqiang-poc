import type { Duplex } from 'node:stream';
import { createWebSocketStream, WebSocket, WebSocketServer } from 'ws';
import { filter, map, pipeline, writeToStream } from 'streaming-iterables';

import { TunInterfacePool } from './tun/TunInterfacePool.js';
import { TunInterface } from './tun/TunInterface.js';
import { Ipv4Or6Packet } from './ip/Ipv4Or6Packet.js';
import { initPacket } from './ip/packets.js';
import { Ipv6Packet } from './ip/ipv6/Ipv6Packet.js';

const TUN_INTERFACE_COUNT = 5;
const tunPool = new TunInterfacePool(TUN_INTERFACE_COUNT);

function isPacket(packet: Ipv4Or6Packet | null): packet is Ipv4Or6Packet {
  return packet !== null;
}

function forwardPacketsFromTunnel(
  wsStream: Duplex,
  tunInterface: TunInterface,
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

      const sourceAddress = packet.getSourceAddress();
      if (!tunInterface.subnetContainsAddress(sourceAddress)) {
        console.log(`✖ T→I: ${packet} (Source is outside interface subnet)`);
        return null;
      }
      if (!sourceAddress.isAssignable()) {
        console.log(`✖ T→I: ${packet} (Source address is not assignable)`);
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
    tunInterface.createWriter(),
  );
}

async function forwardPacketsFromInternet(
  wsStream: Duplex,
  tunInterface: TunInterface,
) {
  return pipeline(
    () => tunInterface.createReader(),
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

      console.log(`✔ I→T: ${packet}`);
      return packet.buffer;
    }),
    filter((packetBuffer): packetBuffer is Buffer => packetBuffer !== null),
    writeToStream(wsStream),
  );
}

async function handleConnection(wsClient: WebSocket) {
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

  const wsStream = createWebSocketStream(wsClient);
  wsClient.send(tunInterface.subnet);
  await Promise.all([
    forwardPacketsFromTunnel(wsStream, tunInterface),
    forwardPacketsFromInternet(wsStream, tunInterface),
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
