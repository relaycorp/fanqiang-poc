import { IpAddress } from '../IpAddress.js';
import { Ipv4SubnetSet } from './Ipv4SubnetSet.js';

const NON_ASSIGNABLE_OCTETS = new Set([
  0, // Network address
  1, // Gateway address
  255, // Broadcast address
]);

const PRIVATE_SUBNETS = new Ipv4SubnetSet([
  { address: [0, 0, 0, 0], mask: 8 },
  { address: [10, 0, 0, 0], mask: 8 },
  { address: [100, 64, 0, 0], mask: 10 },
  { address: [127, 0, 0, 0], mask: 8 },
  { address: [169, 254, 0, 0], mask: 16 },
  { address: [172, 16, 0, 0], mask: 12 },
  { address: [192, 0, 0, 0], mask: 24 },
  { address: [192, 0, 0, 0], mask: 29 },
  { address: [192, 0, 0, 8], mask: 32 },
  { address: [192, 0, 0, 9], mask: 32 },
  { address: [192, 0, 0, 10], mask: 32 },
  { address: [192, 0, 0, 170], mask: 32 },
  { address: [192, 0, 0, 171], mask: 32 },
  { address: [192, 0, 2, 0], mask: 24 },
  { address: [192, 31, 196, 0], mask: 24 },
  { address: [192, 52, 193, 0], mask: 24 },
  { address: [192, 88, 99, 0], mask: 24 },
  { address: [192, 168, 0, 0], mask: 16 },
  { address: [192, 175, 48, 0], mask: 24 },
  { address: [198, 18, 0, 0], mask: 15 },
  { address: [198, 51, 100, 0], mask: 24 },
  { address: [203, 0, 113, 0], mask: 24 },
  { address: [240, 0, 0, 0], mask: 4 },
  { address: [255, 255, 255, 255], mask: 32 },
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

  public override isPrivate(): boolean {
    const octets = Array.from(this.buffer);
    return PRIVATE_SUBNETS.contains(octets);
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
