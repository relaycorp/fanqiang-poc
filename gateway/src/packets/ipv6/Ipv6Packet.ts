import { IpPacket } from '../IpPacket.js';
import { Ipv6Address } from './Ipv6Address.js';

export class Ipv6Packet extends IpPacket<Ipv6Address> {
  override getSourceAddress(): Ipv6Address {
    throw new Error('Method not implemented.');
  }

  override replaceSourceAddress(newIpAddress: Ipv6Address): void {
    throw new Error('Method not implemented.');
  }

  override getDestinationAddress(): Ipv6Address {
    throw new Error('Method not implemented.');
  }

  override replaceDestinationAddress(newIpAddress: Ipv6Address): void {
    throw new Error('Method not implemented.');
  }

  override getPayload(): Buffer {
    throw new Error('Method not implemented.');
  }
}
