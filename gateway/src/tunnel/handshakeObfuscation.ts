import { setTimeout } from 'node:timers/promises';
import type { Logger } from 'pino';
import type { WebSocket } from 'ws';

import { RandomItemSelector } from '../utils/RandomItemSelector.js';

const MIN_DELAY_MS = 100;
const MAX_DELAY_MS = 500;

const MAX_NOISE_SIZE = 1024;
const NOISE_BUFFER = Buffer.alloc(MAX_NOISE_SIZE);

type ObfuscationFunction = (
  wsClient: WebSocket,
  logger: Logger,
) => Promise<void> | void;

function getRandomDelayMs(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function delay(): Promise<void> {
  const delayMs = getRandomDelayMs(MIN_DELAY_MS, MAX_DELAY_MS);
  await setTimeout(delayMs);
}

function generateNoise(): Buffer {
  const noiseSize = Math.min(1, Math.floor(Math.random() * MAX_NOISE_SIZE));
  return NOISE_BUFFER.subarray(0, noiseSize);
}

function sendNoise(wsClient: WebSocket, logger: Logger): void {
  const noise = generateNoise();
  logger.debug({ noiseSize: noise.length }, 'Sending noise');
  wsClient.send(noise);
}

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
