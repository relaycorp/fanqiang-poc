import { SubnetSet } from '../subnetSets.js';

export class Ipv4SubnetSet extends SubnetSet {
  protected readonly bitsCount = 32;

  protected override getBitForIndex(index: number, ipAddress: number[]) {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = 7 - (index % 8);
    return (ipAddress[byteIndex] >> bitIndex) & 1;
  }
}
