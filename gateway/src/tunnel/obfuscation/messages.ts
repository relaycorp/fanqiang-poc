import { generateNoise } from './utils.js';

const LENGTH_MASK = 0b10000000_00000000;

const LENGTH_PREFIX_SIZE = 2;

export function padMessage(message: Buffer): Buffer {
  const messageLength = Buffer.allocUnsafe(LENGTH_PREFIX_SIZE);
  const lengthMasked = message.length | LENGTH_MASK;
  messageLength.writeUInt16BE(lengthMasked);

  const padding = generateNoise();

  return Buffer.concat([messageLength, message, padding]);
}

export function unpadMessage(paddedMessage: Buffer): Buffer {
  const messageLength = paddedMessage.readUInt16BE(0) & ~LENGTH_MASK;
  return paddedMessage.subarray(
    LENGTH_PREFIX_SIZE,
    messageLength + LENGTH_PREFIX_SIZE,
  );
}
