import { map, pipeline } from 'streaming-iterables';

import { TunInterface } from './TunInterface.js';
import { IpPacket } from './packets/IpPacket.js';
import { calculateChecksum } from './utils/ip.js';
import { Ipv4Packet } from './packets/Ipv4Packet.js';

function convertToICMPReply(packet: IpPacket): IpPacket {
  const buffer = packet.buffer;

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

  if (packet instanceof Ipv4Packet) {
    packet.recalculateChecksum();
  }

  // Recalculate ICMP checksum
  const icmpChecksum = calculateChecksum(buffer.subarray(icmpStart));
  buffer.writeUInt16BE(icmpChecksum, icmpStart + 2);

  // TODO: Truncate the buffer too if we truncated the IP header options above.
  return packet;
}

(async () => {
  const tunInterface = await TunInterface.open();
  console.log('Opened TUN device');

  process.on('SIGINT', async () => {
    console.log('Closing TUN interface');
    await tunInterface.close();
    console.log('Closed TUN interface');
  });

  await pipeline(
    () => tunInterface.streamPackets(),
    map((packet) => {
      console.log('I:', packet.buffer.toString('hex'));
      return packet;
    }),
    map(convertToICMPReply),
    map((packet) => {
      console.log('O:', packet.buffer.toString('hex'));
      return packet;
    }),
    tunInterface.createWriter(),
  );
})();
