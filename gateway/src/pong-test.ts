import { map, pipeline } from 'streaming-iterables';

import { TunInterface } from './TunInterface.js';
import { IpPacket } from './packets/IpPacket.js';
import { calculateChecksum } from './utils/ip.js';
import { Ipv4Packet } from './packets/ipv4/Ipv4Packet.js';
import { IpAddress } from './packets/IpAddress.js';

function convertIcmpRequestToResponse(icmpMessage: Buffer) {
  icmpMessage[0] = 0; // Change type to Echo Reply (0)

  // Recalculate ICMP checksum
  icmpMessage.writeUInt16BE(0, 2);
  const icmpChecksum = calculateChecksum(icmpMessage);
  icmpMessage.writeUInt16BE(icmpChecksum, 2);
}

function convertToICMPReply<Address extends IpAddress>(
  packet: IpPacket<Address>,
): IpPacket<Address> {
  const buffer = packet.buffer;

  // IPv4 header modifications (truncate options)
  buffer[0] = (buffer[0] & 0xf0) | 0x05; // Keep IP version as 4 and set header length to 5 (20 bytes)

  // Swap source and destination IP addresses
  const sourceIP = buffer.readUInt32BE(12);
  const destIP = buffer.readUInt32BE(16);
  buffer.writeUInt32BE(destIP, 12);
  buffer.writeUInt32BE(sourceIP, 16);
  if (packet instanceof Ipv4Packet) {
    packet.recalculateChecksum();
  }

  // ICMP modifications
  const icmpMessage = packet.getPayload();
  convertIcmpRequestToResponse(icmpMessage);

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
    () => tunInterface.createReader(),
    map((packet) => {
      console.log(
        `I: ${packet.getSourceAddress()} -> ${packet.getDestinationAddress()}`,
      );
      return packet;
    }),
    map(convertToICMPReply),
    map((packet) => {
      console.log(
        `O: ${packet.getSourceAddress()} -> ${packet.getDestinationAddress()}`,
      );
      return packet;
    }),
    tunInterface.createWriter(),
  );
})();
