import { Readable } from 'stream';

import { delay, generateNoise } from './utils.js';

async function* randomNoiseGenerator() {
  while (true) {
    await delay();
    yield generateNoise();
  }
}

export function makeNoiseStream() {
  return Readable.from(randomNoiseGenerator(), {
    emitClose: true,
    autoDestroy: true,
    objectMode: true,
  });
}
