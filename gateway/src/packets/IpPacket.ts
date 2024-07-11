import { IpAddress } from './IpAddress.js';

export abstract class IpPacket<Address extends IpAddress> {
  constructor(public buffer: Buffer) {}

  abstract getPayload(): Buffer;

  abstract getSourceAddress(): Address;

  abstract getDestinationAddress(): Address;
}
