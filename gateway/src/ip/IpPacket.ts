import { Ipv4Or6Address } from './Ipv4Or6Address.js';
import { IpPacketValidation } from './IpPacketValidation.js';
import { ForwardingSide } from '../nat/ForwardingSide.js';

export abstract class IpPacket<Address extends Ipv4Or6Address> {
  constructor(public buffer: Buffer) {}

  public abstract getSourceAddress(): Address;
  public abstract setSourceAddress(newIpAddress: Address): void;

  public abstract getDestinationAddress(): Address;
  public abstract setDestinationAddress(newIpAddress: Address): void;

  protected abstract getHopLimit(): number;
  protected abstract decrementHopLimit(): void;

  public abstract getTransportProtocol(): number;

  public validate(): IpPacketValidation {
    if (this.getHopLimit() < 1) {
      return IpPacketValidation.EXPIRED;
    }

    return IpPacketValidation.VALID;
  }

  public prepareForForwarding(side: ForwardingSide, address: Address): void {
    if (side === ForwardingSide.SOURCE) {
      this.setSourceAddress(address);
    } else {
      this.setDestinationAddress(address);
    }

    this.decrementHopLimit();
  }

  public toString(): string {
    const payloadInfo = `Protocol=${this.getTransportProtocol()}`;
    const hopLimit = this.getHopLimit();
    return `${this.getSourceAddress()} → ${this.getDestinationAddress()} (TTL: ${hopLimit}). Payload: ${payloadInfo}`;
  }
}
