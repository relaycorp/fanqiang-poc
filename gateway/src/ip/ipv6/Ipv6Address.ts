import { BaseIpAddress } from '../BaseIpAddress.js';

export class Ipv6Address extends BaseIpAddress<Ipv6Address> {
  public static readonly HEXTETS_LENGTH = 16; // IPv6 addresses are 128 bits (16 bytes)

  constructor(buffer: Buffer) {
    super(buffer);

    if (buffer.length !== Ipv6Address.HEXTETS_LENGTH) {
      throw new Error('Invalid IPv6 address length');
    }
  }

  public toString(): string {
    const hextets = [];
    for (let index = 0; index < Ipv6Address.HEXTETS_LENGTH; index += 2) {
      const hextet = this.buffer.readUInt16BE(index);
      hextets.push(hextet.toString(16));
    }
    return hextets.join(':');
  }

  public override clone() {
    const newBuffer = this.cloneBuffer();
    return new Ipv6Address(newBuffer);
  }
}
