import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);

const tunPath = path.join(
  __dirname,
  '..',
  '..',
  'build',
  'Release',
  'tun.node',
);

const tun = require(tunPath);

export const tunAlloc = tun.tunAlloc;
