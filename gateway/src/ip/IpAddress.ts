import is_ip_private from 'private-ip';

export abstract class IpAddress<T extends IpAddress<T>> {
  protected constructor(public buffer: Buffer) {}

  public abstract toString(): string;

  public equals(other: IpAddress<any>): boolean {
    return this.buffer.equals(other.buffer);
  }

  public isPrivate(): boolean {
    // Don't convert to string in production. Use a binary tree or trie.
    // Also, the private-ip package doesn't seem robust enough with IPv6 addresses
    // as it assumes they've been normalised.
    const addressString = this.toString();
    return is_ip_private(addressString)!!;
  }

  public abstract isAssignable(): boolean;
}
