import { generateNoise } from './utils.js';

const LENGTH_MASK = 0b10000000_00000000;

const LENGTH_PREFIX_SIZE = 2;

export function padPacket(packet: Buffer): Buffer {
  const packetLength = Buffer.allocUnsafe(LENGTH_PREFIX_SIZE);
  const lengthMasked = packet.length | LENGTH_MASK;
  packetLength.writeUInt16BE(lengthMasked);

  const padding = generateNoise();

  return Buffer.concat([packetLength, packet, padding]);
}

export function unpadPacket(paddedPacket: Buffer): Buffer {
  const packetLength = paddedPacket.readUInt16BE(0) & ~LENGTH_MASK;
  return paddedPacket.subarray(
    LENGTH_PREFIX_SIZE,
    packetLength + LENGTH_PREFIX_SIZE,
  );
}
