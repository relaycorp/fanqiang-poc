import { BaseIpAddress } from './BaseIpAddress.js';

export abstract class IpPacket<Address extends BaseIpAddress> {
  constructor(public buffer: Buffer) {}

  abstract getPayload(): Buffer;

  abstract getSourceAddress(): Address;
  abstract replaceSourceAddress(newIpAddress: Address): void;

  abstract getDestinationAddress(): Address;
  abstract replaceDestinationAddress(newIpAddress: Address): void;
}
