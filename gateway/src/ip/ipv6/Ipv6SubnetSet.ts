import { SubnetSet } from '../subnetSets.js';

export class Ipv6SubnetSet extends SubnetSet {
  protected readonly bitsCount = 128;

  protected override getBitForIndex(index: number, ipAddress: number[]) {
    const hextetIndex = Math.floor(index / 16);
    const bitIndex = 15 - (index % 16);
    return (ipAddress[hextetIndex] >> bitIndex) & 1;
  }
}
