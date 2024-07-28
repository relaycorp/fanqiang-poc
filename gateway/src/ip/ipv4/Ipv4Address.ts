import { IpAddress } from '../IpAddress.js';

const NON_ASSIGNABLE_OCTETS = new Set([
  0, // Network address
  1, // Gateway address
  255, // Broadcast address
]);

export class Ipv4Address extends IpAddress<Ipv4Address> {
  public static readonly OCTETS_LENGTH = 4;

  constructor(buffer: Buffer) {
    super(buffer);

    if (buffer.length !== Ipv4Address.OCTETS_LENGTH) {
      throw new Error('Invalid IPv4 address length');
    }
  }

  public override isAssignable(): boolean {
    const lastOctet = this.buffer[Ipv4Address.OCTETS_LENGTH - 1];
    return !NON_ASSIGNABLE_OCTETS.has(lastOctet);
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
}
