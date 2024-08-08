class TrieNode {
  children: Map<number, TrieNode>;
  isEndOfSubnet: boolean;

  constructor() {
    this.children = new Map();
    this.isEndOfSubnet = false;
  }
}

type Subnet = { address: number[]; mask: number };

export abstract class SubnetSet {
  protected readonly root = new TrieNode();

  protected abstract bitsCount: number;

  constructor(subnets: readonly Subnet[]) {
    for (const subnet of subnets) {
      this.add(subnet.address, subnet.mask);
    }
  }

  protected abstract getBitForIndex(index: number, ipAddress: number[]): number;

  protected add(ipAddress: number[], mask: number): void {
    if (mask < 0 || this.bitsCount < mask) {
      throw new Error(`Invalid subnet mask (${mask})`);
    }

    let node = this.root;

    for (let index = 0; index < mask; index++) {
      const bit = this.getBitForIndex(index, ipAddress);

      if (!node.children.has(bit)) {
        node.children.set(bit, new TrieNode());
      }
      node = node.children.get(bit)!;
    }

    node.isEndOfSubnet = true;
  }

  public contains(ipAddress: number[]): boolean {
    let node = this.root;

    for (let index = 0; index < this.bitsCount; index++) {
      if (node.isEndOfSubnet) {
        return true;
      }

      const bit = this.getBitForIndex(index, ipAddress);

      if (!node.children.has(bit)) {
        return false;
      }
      node = node.children.get(bit)!;
    }

    return node.isEndOfSubnet;
  }
}
