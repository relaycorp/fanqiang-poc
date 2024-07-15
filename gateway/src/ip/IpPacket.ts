import { BaseIpAddress } from './BaseIpAddress.js';

export abstract class IpPacket<Address extends BaseIpAddress<any>> {
  constructor(public buffer: Buffer) {}

  abstract getPayload(): Buffer;

  abstract getSourceAddress(): Address;
  abstract replaceSourceAddress(newIpAddress: Address): void;

  abstract getDestinationAddress(): Address;
  abstract replaceDestinationAddress(newIpAddress: Address): void;

  public toString(): string {
    return `${this.getSourceAddress()} → ${this.getDestinationAddress()}`;
  }
}
