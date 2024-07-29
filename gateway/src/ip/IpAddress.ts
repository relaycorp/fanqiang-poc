export abstract class IpAddress<T extends IpAddress<T>> {
  protected constructor(public buffer: Buffer) {}

  public abstract toString(): string;

  public equals(other: IpAddress<any>): boolean {
    return this.buffer.equals(other.buffer);
  }

  public abstract isPrivate(): boolean;

  public abstract isAssignable(): boolean;
}
