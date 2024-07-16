import { IpPacket } from '../IpPacket.js';
import { Ipv6Address } from './Ipv6Address.js';

enum HeaderFieldIndex {
  SOURCE_ADDRESS = 8,
  DESTINATION_ADDRESS = 24,
  HOP_LIMIT = 7,
}

export class Ipv6Packet extends IpPacket<Ipv6Address> {
  override getSourceAddress(): Ipv6Address {
    const addressBuffer = this.buffer.subarray(
      HeaderFieldIndex.SOURCE_ADDRESS,
      HeaderFieldIndex.SOURCE_ADDRESS + Ipv6Address.HEXTETS_LENGTH,
    );
    return new Ipv6Address(addressBuffer);
  }

  override setSourceAddress(newIpAddress: Ipv6Address): void {
    newIpAddress.buffer.copy(this.buffer, HeaderFieldIndex.SOURCE_ADDRESS);
  }

  override getDestinationAddress(): Ipv6Address {
    const addressBuffer = this.buffer.subarray(
      HeaderFieldIndex.DESTINATION_ADDRESS,
      HeaderFieldIndex.DESTINATION_ADDRESS + Ipv6Address.HEXTETS_LENGTH,
    );
    return new Ipv6Address(addressBuffer);
  }

  override setDestinationAddress(newIpAddress: Ipv6Address): void {
    newIpAddress.buffer.copy(this.buffer, HeaderFieldIndex.DESTINATION_ADDRESS);
  }

  override getTransportProtocol(): number {
    throw new Error('Method not implemented.');
  }

  override getPayload(): Buffer {
    throw new Error('Method not implemented.');
  }

  protected override getHopLimit(): number {
    return this.buffer[HeaderFieldIndex.HOP_LIMIT];
  }
}
