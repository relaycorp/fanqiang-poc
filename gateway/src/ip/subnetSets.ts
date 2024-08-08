export class TrieNode {
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

  constructor(subnets: readonly Subnet[]) {
    for (const subnet of subnets) {
      this.add(subnet.address, subnet.mask);
    }
  }

  protected abstract add(address: number[], mask: number): void;

  abstract contains(ipAddress: number[]): boolean;
}
