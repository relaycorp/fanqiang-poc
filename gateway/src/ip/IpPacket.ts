import { Ipv4Or6Address } from './ipv4Or6.js';

export abstract class IpPacket<Address extends Ipv4Or6Address> {
  constructor(public buffer: Buffer) {}

  public abstract getSourceAddress(): Address;
  public abstract setSourceAddress(newIpAddress: Address): void;

  public abstract getDestinationAddress(): Address;
  public abstract setDestinationAddress(newIpAddress: Address): void;

  public abstract getTransportProtocol(): number;

  public toString(): string {
    return `${this.getSourceAddress()} → ${this.getDestinationAddress()} (L4 protocol: ${this.getTransportProtocol()})`;
  }
}
