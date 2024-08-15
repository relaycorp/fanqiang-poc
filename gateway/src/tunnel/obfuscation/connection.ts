import { WebSocket } from 'ws';
import type { Logger } from 'pino';
import { delay, sendNoise } from './utils.js';

export async function sendNoiseWhilstOpen(
  ws: WebSocket,
  logger: Logger,
): Promise<void> {
  await delay();

  while (ws.readyState === WebSocket.OPEN) {
    sendNoise(ws, logger);
    await delay();
  }
}
