import { IpAddress } from '../IpAddress.js';

export class Ipv4Address extends IpAddress<Ipv4Address> {
  public static readonly OCTETS_LENGTH = 4;

  constructor(buffer: Buffer) {
    super(buffer);

    if (buffer.length !== Ipv4Address.OCTETS_LENGTH) {
      throw new Error('Invalid IPv4 address length');
    }
  }

  public toString(): string {
    return this.buffer.join('.');
  }

  public static fromString(ipAddress: string): Ipv4Address {
    const octetStrings = ipAddress.split('.');
    if (octetStrings.length !== Ipv4Address.OCTETS_LENGTH) {
      throw new Error(`Invalid IPv4 address (${ipAddress})`);
    }

    const octets = octetStrings.map((octetString) => {
      const octet = Number(octetString);
      if (!Number.isInteger(octet) || octet < 0 || octet > 255) {
        throw new Error(`Invalid IPv4 address octet (${octetString})`);
      }
      return octet;
    });

    const buffer = Buffer.from(octets);
    return new Ipv4Address(buffer);
  }

  override clone() {
    const newBuffer = this.cloneBuffer();
    return new Ipv4Address(newBuffer);
  }
}
