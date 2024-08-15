import { MTU } from '../../tun/constants.js';
import { WebSocket } from 'ws';
import type { Logger } from 'pino';
import { setTimeout } from 'node:timers/promises';

const MIN_DELAY_MS = 100;
const MAX_DELAY_MS = 1_000;
const MAX_NOISE_SIZE = MTU;
const NOISE_BUFFER = Buffer.alloc(MAX_NOISE_SIZE);

function getRandomDelayMs(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export async function delay(): Promise<void> {
  const delayMs = getRandomDelayMs(MIN_DELAY_MS, MAX_DELAY_MS);
  await setTimeout(delayMs);
}

export function generateNoise(): Buffer {
  const noiseSize = Math.min(1, Math.floor(Math.random() * MAX_NOISE_SIZE));
  return NOISE_BUFFER.subarray(0, noiseSize);
}

export function sendNoise(wsClient: WebSocket, logger: Logger): void {
  const noise = generateNoise();
  logger.trace({ noiseSize: noise.length }, 'Sending noise');
  wsClient.send(noise);
}
