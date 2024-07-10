import { map, pipeline } from 'streaming-iterables';

import { TunInterface } from './TunInterface.js';

function convertToICMPReply(buffer: Buffer): Buffer {
  // IPv4 header modifications (truncate options)
  buffer[0] = (buffer[0] & 0xf0) | 0x05; // Keep IP version as 4 and set header length to 5 (20 bytes)

  // Swap source and destination IP addresses
  const sourceIP = buffer.readUInt32BE(12);
  const destIP = buffer.readUInt32BE(16);
  buffer.writeUInt32BE(destIP, 12);
  buffer.writeUInt32BE(sourceIP, 16);

  // Reset IP header checksum
  buffer.writeUInt16BE(0, 10);

  // ICMP modifications
  const icmpStart = (buffer[0] & 0x0f) * 4; // ICMP starts after IP header
  buffer[icmpStart] = 0; // Change type to Echo Reply (0)

  // Reset ICMP checksum
  buffer.writeUInt16BE(0, icmpStart + 2);

  // Recalculate IP header checksum
  const ipChecksum = calculateChecksum(buffer.subarray(0, 20));
  buffer.writeUInt16BE(ipChecksum, 10);

  // Recalculate ICMP checksum
  const icmpChecksum = calculateChecksum(buffer.subarray(icmpStart));
  buffer.writeUInt16BE(icmpChecksum, icmpStart + 2);

  // TODO: Truncate the buffer too if we truncated the IP header options above.
  return buffer;
}

function calculateChecksum(buffer: Buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 2) {
    sum += buffer.readUInt16BE(i);
  }
  sum = (sum >> 16) + (sum & 0xffff);
  sum += sum >> 16;
  return ~sum & 0xffff;
}

(async () => {
  const tunInterface = await TunInterface.open();
  console.log('Opened TUN device');

  const abortController = new AbortController();
  abortController.signal.addEventListener('abort', async () => {
    console.log('Aborting packet processing');
    await tunInterface.close();
    console.log('Aborted packet processing');
  });

  process.on('exit', () => {
    abortController.abort();
  });

  await pipeline(
    () => tunInterface.streamPackets(abortController.signal),
    async function* (packets) {
      for await (const packet of packets) {
        console.log('Received packet:', packet.byteLength);
        yield packet;
      }
    },
    map(convertToICMPReply),
    tunInterface.createWriter(),
  );
})();
