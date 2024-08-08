import { IncomingMessage } from 'node:http';
import { Logger } from 'pino';
import { createWebSocketStream, WebSocket, WebSocketServer } from 'ws';
import { Transform } from 'node:stream';

import { TunInterfacePool } from './tun/TunInterfacePool.js';
import { TunInterface } from './tun/TunInterface.js';
import { initPacket, Ipv4Or6Packet } from './ip/ipv4Or6.js';
import { createLogger } from './utils/logging.js';

const TUN_INTERFACE_COUNT = 5;
const tunPool = new TunInterfacePool(TUN_INTERFACE_COUNT);

function createTunnelToInternetTransform(
  tunInterface: TunInterface,
  logger: Logger,
) {
  return new Transform({
    objectMode: true,
    transform(chunk: Buffer, _encoding, callback) {
      let packet: Ipv4Or6Packet;
      try {
        packet = initPacket(chunk);
      } catch (err) {
        logger.info(
          { err },
          'Dropping packet from Tunnel: Malformed IP packet',
        );
        return callback();
      }

      if (packet.getDestinationAddress().isPrivate()) {
        logger.info(
          { packet },
          'Dropping packet from Tunnel: Destination is private',
        );
        return callback();
      }

      const sourceAddress = packet.getSourceAddress();
      if (!tunInterface.subnetContainsAddress(sourceAddress)) {
        logger.info(
          { packet },
          'Dropping packet from Tunnel: Source is outside interface subnet',
        );
        return callback();
      }
      if (!sourceAddress.isAssignable()) {
        logger.info(
          { packet },
          'Dropping packet from Tunnel: Source is not assignable',
        );
        return callback();
      }

      logger.debug({ packet }, 'Forwarding packet from tunnel to internet');
      this.push(packet);
      callback();
    },
  });
}

function createInternetToTunnelTransform(logger: Logger) {
  return new Transform({
    objectMode: true,
    transform(packet: Ipv4Or6Packet, _encoding, callback) {
      if (packet.getSourceAddress().isPrivate()) {
        logger.info(
          { packet },
          'Dropping packet from Internet: Source is private',
        );
        return callback();
      }

      logger.debug(
        { packet },
        'Forwarding packet from the Internet to the tunnel',
      );
      this.push(packet.buffer);
      callback();
    },
  });
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
  wsClient.send(`${tunInterface.ipv4Subnet},${tunInterface.ipv6Subnet}`);

  const tunnelToInternetTransform = createTunnelToInternetTransform(
    tunInterface,
    connectionAwareLogger,
  );
  const internetToTunnelTransform = createInternetToTunnelTransform(
    connectionAwareLogger,
  );

  wsStream.pipe(tunnelToInternetTransform).pipe(tunInterface.createWriter());
  tunInterface.createReader().pipe(internetToTunnelTransform).pipe(wsStream);
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
