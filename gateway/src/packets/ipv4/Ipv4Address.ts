import { IpAddress } from '../IpAddress.js';

export class Ipv4Address extends IpAddress {
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
}
