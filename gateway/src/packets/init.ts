import { Ipv4Packet } from './Ipv4Packet.js';
import { Ipv6Packet } from './Ipv6Packet.js';
import { IpPacket } from './IpPacket.js';

function getIpVersion(buffer: Buffer) {
  return buffer[0] >> 4;
}

export function initPacket(buffer: Buffer): IpPacket {
  const version = getIpVersion(buffer);
  let packet: IpPacket;
  switch (version) {
    case 4:
      packet = new Ipv4Packet(buffer);
      break;
    case 6:
      packet = new Ipv6Packet(buffer);
      break;
    default:
      throw new Error(`Unsupported IP version: ${version}`);
  }
  return packet;
}
