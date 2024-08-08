import { Ipv4Packet } from './ipv4/Ipv4Packet.js';
import { Ipv6Packet } from './ipv6/Ipv6Packet.js';
import { Ipv4Address } from './ipv4/Ipv4Address.js';
import { Ipv6Address } from './ipv6/Ipv6Address.js';

export type Ipv4Or6Packet = Ipv4Packet | Ipv6Packet;

export type Ipv4Or6Address = Ipv4Address | Ipv6Address;

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

export function initAddress(address: string): Ipv4Or6Address {
  if (address.includes(':')) {
    return Ipv6Address.fromString(address);
  } else if (address.includes('.')) {
    return Ipv4Address.fromString(address);
  } else {
    throw new Error(`Invalid IP address format: ${address}`);
  }
}
