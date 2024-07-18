/**
 * Run the _Internet Checksum_ on the given buffer(s).
 */
export function calculateChecksum(...buffers: readonly Buffer[]): number {
  let sum = 0;
  for (const buffer of buffers) {
    for (let index = 0; index < buffer.length; index += 2) {
      sum += buffer.readUInt16BE(index);
    }
  }
  sum = (sum >> 16) + (sum & 0xffff);
  sum += sum >> 16;
  return ~sum & 0xffff;
}
