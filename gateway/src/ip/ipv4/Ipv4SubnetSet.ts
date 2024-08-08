import { SubnetSet, TrieNode } from '../subnetSets.js';

const IPV4_BITS = 32;

function getBitForIndex(index: number, ipAddress: number[]) {
  const byteIndex = Math.floor(index / 8);
  const bitIndex = 7 - (index % 8);
  return (ipAddress[byteIndex] >> bitIndex) & 1;
}

export class Ipv4SubnetSet extends SubnetSet {
  protected add(ipAddress: number[], mask: number): void {
    if (mask < 0 || IPV4_BITS < mask) {
      throw new Error(`Invalid subnet mask (${mask})`);
    }

    let node = this.root;

    for (let index = 0; index < mask; index++) {
      const bit = getBitForIndex(index, ipAddress);

      if (!node.children.has(bit)) {
        node.children.set(bit, new TrieNode());
      }
      node = node.children.get(bit)!;
    }

    node.isEndOfSubnet = true;
  }

  public contains(ipAddress: number[]): boolean {
    let node = this.root;

    for (let index = 0; index < IPV4_BITS; index++) {
      if (node.isEndOfSubnet) {
        return true;
      }

      const bit = getBitForIndex(index, ipAddress);

      if (!node.children.has(bit)) {
        return false;
      }
      node = node.children.get(bit)!;
    }

    return node.isEndOfSubnet;
  }
}
