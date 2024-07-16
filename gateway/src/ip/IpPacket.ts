import { ServiceDataUnit } from '../serviceDataUnits/ServiceDataUnit.js';
import { Ipv4OrIpv6Address } from './Ipv4OrIpv6Address.js';
import { BaseIpChecksumContext } from '../serviceDataUnits/checksums/IpChecksumContext.js';
import { initServiceData } from '../serviceDataUnits/init.js';
import { IpPacketValidation } from './IpPacketValidation.js';

export abstract class IpPacket<Address extends Ipv4OrIpv6Address> {
  constructor(public buffer: Buffer) {}

  public abstract getSourceAddress(): Address;
  public abstract setSourceAddress(newIpAddress: Address): void;

  public abstract getDestinationAddress(): Address;
  public abstract setDestinationAddress(newIpAddress: Address): void;

  protected abstract getHopLimit(): number;

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
      const isServiceDataValid = serviceData.validate(checksumContext);
      if (!isServiceDataValid) {
        return IpPacketValidation.INVALID_PAYLOAD;
      }
    }

    return IpPacketValidation.VALID;
  }

  public toString(): string {
    const serviceData = this.getServiceData();
    let serviceDataInfo: string;
    if (serviceData instanceof Buffer) {
      serviceDataInfo = `Protocol=${this.getTransportProtocol()}, ${serviceData.byteLength} bytes`;
    } else {
      serviceDataInfo = serviceData.toString();
    }
    return `${this.getSourceAddress()} → ${this.getDestinationAddress()}. Payload: ${serviceDataInfo}`;
  }
}
