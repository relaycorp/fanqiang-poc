export abstract class IpPacket {
  constructor(public buffer: Buffer) {}

  abstract getPayload(): Buffer;
}
