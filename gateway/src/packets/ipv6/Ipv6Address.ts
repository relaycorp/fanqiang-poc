import { BaseIpAddress } from '../BaseIpAddress.js';

export class Ipv6Address extends BaseIpAddress<Ipv6Address> {
  public static readonly LENGTH = 16; // IPv6 addresses are 128 bits (16 bytes)

  constructor(buffer: Buffer) {
    super(buffer);

    if (buffer.length !== Ipv6Address.LENGTH) {
      throw new Error('Invalid IPv6 address length');
    }
  }

  public toString(): string {
    // Convert each byte to hexadecimal and group every two bytes, separated by colons
    const hextets = [];
    for (let index = 0; index < Ipv6Address.LENGTH; index += 2) {
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
