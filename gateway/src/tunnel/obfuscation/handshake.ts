import type { Logger } from 'pino';
import { WebSocket } from 'ws';

import { RandomItemSelector } from '../../utils/RandomItemSelector.js';
import { delay, sendNoise } from './utils.js';

type ObfuscationFunction = (
  wsClient: WebSocket,
  logger: Logger,
) => Promise<void> | void;

const OBFUSCATION_SELECTOR = new RandomItemSelector<ObfuscationFunction>(
  new Map([
    [function doNothing() {}, 30],

    [delay, 20],

    [sendNoise, 20],

    [
      async function delayThenNoise(wsClient, logger) {
        await delay();
        sendNoise(wsClient, logger);
      },
      10,
    ],

    [
      async function delayThenNoiseThenDelay(wsClient, logger) {
        await delay();
        sendNoise(wsClient, logger);
        await delay();
      },
      10,
    ],

    [
      async function noiseThenDelay(wsClient, logger) {
        sendNoise(wsClient, logger);
        await delay();
      },
      10,
    ],
  ]),
);

export async function potentiallyDelayOrSendNoise(
  wsClient: WebSocket,
  logger: Logger,
): Promise<void> {
  const obfuscation = OBFUSCATION_SELECTOR.select();
  await obfuscation(wsClient, logger);
}
