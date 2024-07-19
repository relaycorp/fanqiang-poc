import { ServiceDataUnit } from '../serviceDataUnits/ServiceDataUnit.js';
import { Ipv4Or6Address } from './Ipv4Or6Address.js';
import { BaseIpChecksumContext } from '../serviceDataUnits/checksums/IpChecksumContext.js';
import { initServiceData } from '../serviceDataUnits/init.js';
import { IpPacketValidation } from './IpPacketValidation.js';
import { ForwardingSide } from '../nat/ForwardingSide.js';
import { ServiceDataValidation } from '../serviceDataUnits/ServiceDataValidation.js';

export abstract class IpPacket<Address extends Ipv4Or6Address> {
  constructor(public buffer: Buffer) {}

  public abstract getSourceAddress(): Address;
  public abstract setSourceAddress(newIpAddress: Address): void;

  public abstract getDestinationAddress(): Address;
  public abstract setDestinationAddress(newIpAddress: Address): void;

  protected abstract getHopLimit(): number;
  protected abstract decrementHopLimit(): void;

  public abstract getTransportProtocol(): number;

  protected abstract getPayload(): Buffer;

  public getServiceData(): ServiceDataUnit | Buffer {
    const payload = this.getPayload();
    const protocol = this.getTransportProtocol();
    return initServiceData(payload, protocol);
  }

  public getServiceDataChecksumContext(): BaseIpChecksumContext<Address> {
    return {
      sourceAddress: this.getSourceAddress(),
      destinationAddress: this.getDestinationAddress(),
    };
  }

  public validate(): IpPacketValidation {
    if (this.getHopLimit() < 1) {
      return IpPacketValidation.EXPIRED;
    }

    const serviceData = this.getServiceData();
    if (serviceData instanceof ServiceDataUnit) {
      const checksumContext = this.getServiceDataChecksumContext();
      const serviceDataValidation = serviceData.validate(checksumContext);
      if (serviceDataValidation !== ServiceDataValidation.VALID) {
        return IpPacketValidation.INVALID_PAYLOAD;
      }
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
    const serviceData = this.getServiceData();
    let serviceDataInfo: string;
    if (serviceData instanceof Buffer) {
      serviceDataInfo = `Protocol=${this.getTransportProtocol()}, ${serviceData.byteLength} bytes`;
    } else {
      serviceDataInfo = serviceData.toString();
    }
    const hopLimit = this.getHopLimit();
    return `${this.getSourceAddress()} → ${this.getDestinationAddress()} (TTL: ${hopLimit}). Payload: ${serviceDataInfo}`;
  }
}
