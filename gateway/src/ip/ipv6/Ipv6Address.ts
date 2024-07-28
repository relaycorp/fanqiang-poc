import { IpAddress } from '../IpAddress.js';

export class Ipv6Address extends IpAddress<Ipv6Address> {
  public static readonly OCTETS_LENGTH = 16; // IPv6 addresses are 128 bits (16 bytes)
  public static readonly HEXTETS_LENGTH = Ipv6Address.OCTETS_LENGTH / 2;

  constructor(buffer: Buffer) {
    super(buffer);

    if (buffer.length !== Ipv6Address.OCTETS_LENGTH) {
      throw new Error('Invalid IPv6 address length');
    }
  }

  public override isAssignable(): boolean {
    throw new Error('Method not implemented.');
  }

  public toString(): string {
    const hextets = [];
    for (let index = 0; index < Ipv6Address.OCTETS_LENGTH; index += 2) {
      const hextet = this.buffer.readUInt16BE(index);
      hextets.push(hextet.toString(16));
    }
    return hextets.join(':');
  }

  public static fromString(ipAddress: string): Ipv6Address {
    const hextetStrings = ipAddress.split(':');
    if (hextetStrings.length !== Ipv6Address.HEXTETS_LENGTH) {
      throw new Error(`Invalid IPv6 address (${ipAddress})`);
    }

    const hextets = hextetStrings.map((hextetString) => {
      const hextet = parseInt(hextetString, 16);
      if (!Number.isInteger(hextet) || hextet < 0 || hextet > 0xffff) {
        throw new Error(`Invalid IPv6 address hextet (${hextetString})`);
      }
      return hextet;
    });

    const buffer = Buffer.allocUnsafe(Ipv6Address.OCTETS_LENGTH);
    hextets.forEach((hextet, index) => {
      buffer.writeUInt16BE(hextet, index * 2);
    });
    return new Ipv6Address(buffer);
  }
}
