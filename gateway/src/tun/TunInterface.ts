import { open, FileHandle } from 'node:fs/promises';
import { map, pipeline, writeToStream } from 'streaming-iterables';

// @ts-ignore
import { tunAlloc } from './tun-wrapper.cjs'; // TODO: Fix type definitions
import { initPacket } from '../ip/packets.js';
import { Ipv4Or6Packet } from '../ip/Ipv4Or6Packet.js';
import { Ipv4Address } from '../ip/ipv4/Ipv4Address.js';

const INTERFACE_PATH = '/dev/net/tun';

// TODO: Consider whether we should retrieve this value from the interface
const INTERFACE_MTU = 1500;

export class TunInterface {
  private readonly file: FileHandle;
  private nextAddress: number = 2; // Because 0 and 1 are reserved

  private constructor(
    file: FileHandle,
    public readonly id: number,
  ) {
    this.file = file;
  }

  public static async open(id: number): Promise<TunInterface> {
    let interfaceFile: FileHandle;
    try {
      // TODO: Use O_NONBLOCK to avoid blocking. This requires handling EAGAIN/EWOULDBLOCK errors.
      interfaceFile = await open(INTERFACE_PATH, 'r+');
    } catch (error) {
      throw new Error('Failed to open TUN device', { cause: error });
    }

    const name = `tun${id}`;
    const tunAllocResult = tunAlloc(name, interfaceFile.fd);
    if (tunAllocResult !== 0) {
      await interfaceFile.close();
      throw new Error(
        `Failed to allocate TUN device (code: ${tunAllocResult})`,
      );
    }

    return new TunInterface(interfaceFile, id);
  }

  public async close(): Promise<void> {
    /*
    TODO: Fix this so it won't hang when there's an outstanding read() but no new packets

    If there's an active read(), the file will be closed successfully upon receiving a new
    packet (which won't be processed).

    This happens regardless of whether createWriteStream() or read() directly is used. I think
    this is because there's no way to cancel the read() operation.

    I think this is the kind of issues that O_NONBLOCK may fix.
     */
    await this.file.close();
  }

  public async *createReader(): AsyncIterable<Ipv4Or6Packet> {
    const stream = this.file.createReadStream({
      autoClose: false,
      highWaterMark: INTERFACE_MTU,
    });
    try {
      // TODO: Handle malformed/invalid packets. Not that it should happen with TUN devices.
      yield* pipeline(() => stream, map(initPacket));
    } catch (error: any) {
      if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
        throw error;
      }
    }
  }

  public createWriter(): (
    packets: AsyncIterable<Ipv4Or6Packet>,
  ) => Promise<void> {
    const stream = this.file.createWriteStream({
      autoClose: false,
      highWaterMark: INTERFACE_MTU,
    });
    return (packets) =>
      pipeline(
        () => packets,
        map((packet) => packet.buffer),
        writeToStream(stream),
      );
  }

  public allocateAddress(): Ipv4Address {
    if (this.nextAddress > 254) {
      throw new Error(
        'No more addresses available in the TUN interface subnet',
      );
    }
    return Ipv4Address.fromString(
      `10.0.${100 + this.id}.${this.nextAddress++}`,
    );
  }
}
