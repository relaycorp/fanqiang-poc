import { IpPacket } from '../IpPacket.js';
import { Ipv6Address } from './Ipv6Address.js';

enum HeaderFieldIndex {
  SOURCE_ADDRESS = 8,
  DESTINATION_ADDRESS = 24,
}

export class Ipv6Packet extends IpPacket<Ipv6Address> {
  override getSourceAddress(): Ipv6Address {
    const addressBuffer = this.buffer.subarray(
      HeaderFieldIndex.SOURCE_ADDRESS,
      HeaderFieldIndex.SOURCE_ADDRESS + Ipv6Address.HEXTETS_LENGTH,
    );
    return new Ipv6Address(addressBuffer);
  }

  override replaceSourceAddress(newIpAddress: Ipv6Address): void {
    newIpAddress.buffer.copy(this.buffer, HeaderFieldIndex.SOURCE_ADDRESS);
  }

  override getDestinationAddress(): Ipv6Address {
    const addressBuffer = this.buffer.subarray(
      HeaderFieldIndex.DESTINATION_ADDRESS,
      HeaderFieldIndex.DESTINATION_ADDRESS + Ipv6Address.HEXTETS_LENGTH,
    );
    return new Ipv6Address(addressBuffer);
  }

  override replaceDestinationAddress(newIpAddress: Ipv6Address): void {
    newIpAddress.buffer.copy(this.buffer, HeaderFieldIndex.DESTINATION_ADDRESS);
  }

  override getPayload(): Buffer {
    throw new Error('Method not implemented.');
  }
}
