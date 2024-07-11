export abstract class BaseIpAddress<T extends BaseIpAddress<T>> {
  protected constructor(public buffer: Buffer) {}

  public abstract toString(): string;

  public abstract clone(): T;

  protected cloneBuffer(): Buffer {
    const newBuffer = Buffer.allocUnsafe(this.buffer.length);
    this.buffer.copy(newBuffer);
    return newBuffer;
  }
}
