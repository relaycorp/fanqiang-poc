import { IncomingMessage } from 'node:http';
import { Logger } from 'pino';
import { createWebSocketStream, WebSocket, WebSocketServer } from 'ws';

import { TunInterfacePool } from './tun/TunInterfacePool.js';
import { TunInterface } from './tun/TunInterface.js';
import { createLogger } from './utils/logging.js';
import { InternetToTunnelTransform } from './tunnel/InternetToTunnelTransform.js';
import { TunnelToInternetTransform } from './tunnel/TunnelToInternetTransform.js';
import { makeNoiseStream } from './tunnel/obfuscation/stream.js';
import { delay } from './tunnel/obfuscation/utils.js';
import { padMessage } from './tunnel/obfuscation/messages.js';

const TUN_INTERFACE_COUNT = 5;
const tunPool = new TunInterfacePool(TUN_INTERFACE_COUNT);

async function sendServerHello(
  wsClient: WebSocket,
  ipv4Subnet: string,
  ipv6Subnet: string,
) {
  await delay();
  const serverHello = Buffer.from(`${ipv4Subnet},${ipv6Subnet}`);
  wsClient.send(padMessage(serverHello));
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

  const noiseStream = makeNoiseStream();

  wsClient.on('close', async () => {
    connectionAwareLogger.info('Connection closed');
    noiseStream.destroy();

    // TODO: Fix this close() as it's causing the process to hang when exiting
    // Try https://github.com/mafintosh/why-is-node-running
    await tunInterface.close();

    tunPool.releaseInterface(tunInterface);
  });

  const wsStream = createWebSocketStream(wsClient);
  noiseStream.pipe(wsStream);

  await sendServerHello(
    wsClient,
    tunInterface.ipv4Subnet,
    tunInterface.ipv6Subnet,
  );

  const tunnelToInternetTransform = new TunnelToInternetTransform(
    tunInterface,
    connectionAwareLogger,
  );
  wsStream.pipe(tunnelToInternetTransform).pipe(tunInterface.createWriter());

  const internetToTunnelTransform = new InternetToTunnelTransform(
    connectionAwareLogger,
  );
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
