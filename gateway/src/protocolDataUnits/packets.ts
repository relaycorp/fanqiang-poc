import { Ipv4Packet } from './ipv4/Ipv4Packet.js';
import { Ipv6Packet } from './ipv6/Ipv6Packet.js';
import { Ipv4Or6Packet } from './Ipv4Or6Packet.js';

const PACKET_CONSTRUCTOR_BY_VERSION = new Map<
  number,
  new (buffer: Buffer) => Ipv4Or6Packet
>([
  [4, Ipv4Packet],
  [6, Ipv6Packet],
]);

function getIpVersion(packet: Buffer) {
  return packet[0] >> 4;
}

export function initPacket(packet: Buffer): Ipv4Or6Packet {
  const ipVersion = getIpVersion(packet);
  const packetConstructor = PACKET_CONSTRUCTOR_BY_VERSION.get(ipVersion);
  if (!packetConstructor) {
    throw new Error(`Unsupported IP version: ${ipVersion}`);
  }
  return new packetConstructor(packet);
}
