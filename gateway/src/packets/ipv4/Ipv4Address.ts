import { BaseIpAddress } from '../BaseIpAddress.js';

export class Ipv4Address extends BaseIpAddress<Ipv4Address> {
  public static readonly LENGTH = 4;

  constructor(buffer: Buffer) {
    super(buffer);

    if (buffer.length !== Ipv4Address.LENGTH) {
      throw new Error('Invalid IPv4 address length');
    }
  }

  public toString(): string {
    return this.buffer.join('.');
  }

  override clone() {
    const newBuffer = this.cloneBuffer();
    return new Ipv4Address(newBuffer);
  }
}
