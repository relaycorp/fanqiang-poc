import type { Duplex } from 'node:stream';
import { IncomingMessage } from 'node:http';
import { Logger } from 'pino';
import { createWebSocketStream, WebSocket, WebSocketServer } from 'ws';
import { pipeline } from 'node:stream/promises';

import { TunInterfacePool } from './tun/TunInterfacePool.js';
import { TunInterface } from './tun/TunInterface.js';
import { Ipv4Or6Packet } from './ip/Ipv4Or6Packet.js';
import { initPacket } from './ip/packets.js';
import { Ipv6Packet } from './ip/ipv6/Ipv6Packet.js';
import { createLogger } from './utils/logging.js';

const TUN_INTERFACE_COUNT = 5;
const tunPool = new TunInterfacePool(TUN_INTERFACE_COUNT);

function forwardPacketsFromTunnel(
  wsStream: Duplex,
  tunInterface: TunInterface,
  logger: Logger,
) {
  const writer = tunInterface.createWriter();
  return pipeline(
    wsStream,
    async function* (source) {
      for await (const chunk of source) {
        let packet: Ipv4Or6Packet;
        try {
          packet = initPacket(chunk as Buffer);
        } catch (err: any) {
          logger.info({ err }, 'Error parsing IP packet');
          continue;
        }

        if (packet instanceof Ipv6Packet) {
          // TODO: Add IPv6 support
          logger.info('Unsupported IPv6 packet');
          continue;
        }

        if (packet.getDestinationAddress().isPrivate()) {
          logger.info({ packet }, 'Destination is private address');
          continue;
        }

        const sourceAddress = packet.getSourceAddress();
        if (!tunInterface.subnetContainsAddress(sourceAddress)) {
          logger.info({ packet }, 'Source is outside interface subnet');
          continue;
        }
        if (!sourceAddress.isAssignable()) {
          logger.info({ packet }, 'Source address is not assignable');
          continue;
        }

        logger.debug({ packet }, 'Forwarding packet from tunnel to internet');
        yield packet;
      }
    },
    writer,
  );
}

function forwardPacketsFromInternet(
  wsStream: Duplex,
  tunInterface: TunInterface,
  logger: Logger,
) {
  return pipeline(
    tunInterface.createReader(),
    async function* (source) {
      for await (const packet of source) {
        if (packet instanceof Ipv6Packet) {
          logger.info('Unsupported IPv6 packet');
          continue;
        }

        if (packet.getSourceAddress().isPrivate()) {
          logger.info({ packet }, 'Source is private address');
          continue;
        }

        logger.debug(
          { packet },
          'Forwarding packet from the Internet to the tunnel',
        );
        yield packet.buffer;
      }
    },
    wsStream,
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
