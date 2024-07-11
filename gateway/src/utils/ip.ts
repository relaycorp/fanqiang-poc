export function calculateChecksum(buffer: Buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 2) {
    sum += buffer.readUInt16BE(i);
  }
  sum = (sum >> 16) + (sum & 0xffff);
  sum += sum >> 16;
  return ~sum & 0xffff;
}
