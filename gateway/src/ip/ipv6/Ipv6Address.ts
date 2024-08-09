import { IpAddress } from '../IpAddress.js';
import { Ipv6SubnetSet } from './Ipv6SubnetSet.js';

const PRIVATE_SUBNETS = new Ipv6SubnetSet([
  { address: [0, 0, 0, 0, 0, 0, 0, 0], mask: 128 }, // ::/128 (Unspecified address)
  { address: [0, 0, 0, 0, 0, 0, 0, 1], mask: 128 }, // ::1/128 (Loopback address)
  { address: [0, 0, 0, 0, 0, 0xffff, 0, 0], mask: 96 }, // ::ffff:0:0/96 (IPv4-mapped addresses)
  { address: [0, 0, 0, 0, 0xffff, 0, 0, 0], mask: 96 }, // ::ffff:0:0:0/96 (IPv4-IPv6 Translators)
  { address: [0x64, 0xff9b, 0, 0, 0, 0, 0, 0], mask: 96 }, // 64:ff9b::/96 (IPv4-IPv6 Translators)
  { address: [0x100, 0, 0, 0, 0, 0, 0, 0], mask: 64 }, // 100::/64 (Discard Prefix)
  { address: [0x2001, 0, 0, 0, 0, 0, 0, 0], mask: 23 }, // 2001::/23 (IETF Protocol Assignments)
  { address: [0x2001, 0x2, 0, 0, 0, 0, 0, 0], mask: 48 }, // 2001:2::/48 (BMWG)
  { address: [0x2001, 0xdb8, 0, 0, 0, 0, 0, 0], mask: 32 }, // 2001:db8::/32 (Documentation Prefix)
  { address: [0x2002, 0, 0, 0, 0, 0, 0, 0], mask: 16 }, // 2002::/16 (6to4)
  { address: [0xfc00, 0, 0, 0, 0, 0, 0, 0], mask: 7 }, // fc00::/7 (Unique Local Addresses)
  { address: [0xfe80, 0, 0, 0, 0, 0, 0, 0], mask: 10 }, // fe80::/10 (Link-Local Addresses)
  { address: [0xfec0, 0, 0, 0, 0, 0, 0, 0], mask: 10 }, // fec0::/10 (Site-Local Addresses - Deprecated)
  { address: [0xff00, 0, 0, 0, 0, 0, 0, 0], mask: 8 }, // ff00::/8 (Multicast Addresses)
]);

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
    return true;
  }

  public override isPrivate(): boolean {
    const hextets = this.getHextets();
    return PRIVATE_SUBNETS.contains(hextets);
  }

  public toString(): string {
    const hextets = this.getHextets().map((h) => h.toString(16));
    return hextets.join(':');
  }

  private getHextets(): number[] {
    const hextets = [];
    for (let index = 0; index < Ipv6Address.OCTETS_LENGTH; index += 2) {
      const hextet = this.buffer.readUInt16BE(index);
      hextets.push(hextet);
    }
    return hextets;
  }

  public static fromString(ipAddress: string): Ipv6Address {
    const hextetStrings = ipAddress.split(':');

    // Handle compressed notation if necessary
    const doubleColonIndex = hextetStrings.indexOf('');
    if (doubleColonIndex !== -1) {
      const before = hextetStrings.slice(0, doubleColonIndex);
      const after = hextetStrings.slice(doubleColonIndex + 1);
      const missing =
        Ipv6Address.HEXTETS_LENGTH - (before.length + after.length);
      const expanded = [...before, ...Array(missing).fill('0'), ...after];
      hextetStrings.splice(0, hextetStrings.length, ...expanded);
    }

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
