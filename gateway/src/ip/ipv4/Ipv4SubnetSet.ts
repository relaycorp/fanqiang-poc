class TrieNode {
  children: Map<number, TrieNode>;
  isEndOfSubnet: boolean;

  constructor() {
    this.children = new Map();
    this.isEndOfSubnet = false;
  }
}

type Subnet = { address: number[]; mask: number };

export class Ipv4SubnetSet {
  private readonly root: TrieNode;

  constructor(subnets: readonly Subnet[] = []) {
    this.root = new TrieNode();
    for (const subnet of subnets) {
      this.add(subnet.address, subnet.mask);
    }
  }

  private add(address: number[], mask: number): void {
    let node = this.root;

    for (let index = 0; index < mask; index++) {
      const byteIndex = Math.floor(index / 8);
      const bitIndex = 7 - (index % 8);
      const bit = (address[byteIndex] >> bitIndex) & 1;

      if (!node.children.has(bit)) {
        node.children.set(bit, new TrieNode());
      }
      node = node.children.get(bit)!;
    }

    node.isEndOfSubnet = true;
  }

  public contains(ipAddress: number[]): boolean {
    let node = this.root;

    for (let index = 0; index < 32; index++) {
      if (node.isEndOfSubnet) {
        return true;
      }

      const byteIndex = Math.floor(index / 8);
      const bitIndex = 7 - (index % 8);
      const bit = (ipAddress[byteIndex] >> bitIndex) & 1;

      if (!node.children.has(bit)) {
        return false;
      }
      node = node.children.get(bit)!;
    }

    return node.isEndOfSubnet;
  }
}
