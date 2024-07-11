import { IpPacket } from './IpPacket.js';

export class Ipv6Packet extends IpPacket {
  override getPayload(): Buffer {
    throw new Error('Method not implemented.');
  }
}
