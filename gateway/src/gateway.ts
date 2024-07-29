import type { Duplex } from 'node:stream';
import { IncomingMessage } from 'node:http';
import { Logger } from 'pino';
import { createWebSocketStream, WebSocket, WebSocketServer } from 'ws';
import { filter, map, pipeline, writeToStream } from 'streaming-iterables';

import { TunInterfacePool } from './tun/TunInterfacePool.js';
import { TunInterface } from './tun/TunInterface.js';
import { Ipv4Or6Packet } from './ip/Ipv4Or6Packet.js';
import { initPacket } from './ip/packets.js';
import { Ipv6Packet } from './ip/ipv6/Ipv6Packet.js';
import { createLogger } from './utils/logging.js';

const TUN_INTERFACE_COUNT = 5;
const tunPool = new TunInterfacePool(TUN_INTERFACE_COUNT);

function isPacket(packet: Ipv4Or6Packet | null): packet is Ipv4Or6Packet {
  return packet !== null;
}

function forwardPacketsFromTunnel(
  wsStream: Duplex,
  tunInterface: TunInterface,
  logger: Logger,
) {
  return pipeline(
    () => wsStream,
    map((packetBuffer) => {
      let packet: Ipv4Or6Packet;
      try {
        packet = initPacket(packetBuffer);
      } catch (err: any) {
        logger.info({ err }, 'Error parsing IP packet');
        return null;
      }

      if (packet instanceof Ipv6Packet) {
        // TODO: Add IPv6 support
        logger.info('Unsupported IPv6 packet');
        return null;
      }

      if (packet.getDestinationAddress().isPrivate()) {
        logger.info({ packet }, 'Destination is private address');
        return null;
      }

      const sourceAddress = packet.getSourceAddress();
      if (!tunInterface.subnetContainsAddress(sourceAddress)) {
        logger.info({ packet }, 'Source is outside interface subnet');
        return null;
      }
      if (!sourceAddress.isAssignable()) {
        logger.info({ packet }, 'Source address is not assignable');
        return null;
      }

      logger.debug({ packet }, 'Forwarding packet from tunnel to internet');
      return packet;
    }),
    filter(isPacket),
    tunInterface.createWriter(),
  );
}

async function forwardPacketsFromInternet(
  wsStream: Duplex,
  tunInterface: TunInterface,
  logger: Logger,
) {
  return pipeline(
    () => tunInterface.createReader(),
    map((packet) => {
      if (packet instanceof Ipv6Packet) {
        // TODO: Add IPv6 support
        logger.info('Unsupported IPv6 packet');
        return null;
      }

      if (packet.getSourceAddress().isPrivate()) {
        logger.info({ packet }, 'Source is private address');
        return null;
      }

      logger.debug(
        { packet },
        'Forwarding packet from the Internet to the tunnel',
      );
      return packet.buffer;
    }),
    filter((packetBuffer): packetBuffer is Buffer => packetBuffer !== null),
    writeToStream(wsStream),
  );
}

async function handleConnection(
  wsClient: WebSocket,
  request: IncomingMessage,
  logger: Logger,
) {
  const connectionAwareLogger = logger.child({
    client: `${request.socket.remoteAddress}:${request.socket.remotePort}`,
  });
  connectionAwareLogger.info('Connection opened');

  let tunInterface: TunInterface;
  try {
    tunInterface = await tunPool.allocateInterface();
  } catch (err) {
    connectionAwareLogger.error({ err }, 'Failed to allocate TUN interface');
    wsClient.close(1013, 'No available TUN interfaces');
    return;
  }

  wsClient.on('close', async () => {
    connectionAwareLogger.info('Connection closed');

    // TODO: Fix this close() as it's causing the process to hang when exiting
    // Try https://github.com/mafintosh/why-is-node-running
    await tunInterface.close();

    tunPool.releaseInterface(tunInterface);
  });

  const wsStream = createWebSocketStream(wsClient);
  wsClient.send(tunInterface.subnet);
  await Promise.all([
    forwardPacketsFromTunnel(wsStream, tunInterface, connectionAwareLogger),
    forwardPacketsFromInternet(wsStream, tunInterface, connectionAwareLogger),
  ]);
}

async function runServer() {
  const logger = createLogger();

  const server = new WebSocketServer({ host: '127.0.0.1', port: 8080 });

  process.on('SIGINT', async () => {
    logger.info('Shutting down...');
    server.close(() => {
      logger.info('WebSocket server closed');
      process.exit(0);
    });
  });

  server.on('connection', async (wsClient, request) => {
    return handleConnection(wsClient, request, logger);
  });

  server.on('listening', () => {
    logger.info('WebSocket server started');
  });
}

await runServer();
