export abstract class IpAddress {
  protected constructor(public buffer: Buffer) {}

  public abstract toString(): string;
}
