import { SubnetSet, TrieNode } from '../subnetSets.js';

const IPV6_BITS = 128;

function getBitForIndex(index: number, ipAddress: number[]) {
  const hextetIndex = Math.floor(index / 16);
  const bitIndex = 15 - (index % 16);
  return (ipAddress[hextetIndex] >> bitIndex) & 1;
}

export class Ipv6SubnetSet extends SubnetSet {
  protected add(ipAddress: number[], mask: number): void {
    if (mask < 0 || IPV6_BITS < mask) {
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

    for (let index = 0; index < IPV6_BITS; index++) {
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
