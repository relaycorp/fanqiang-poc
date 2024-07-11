import { open, FileHandle } from 'node:fs/promises';
import { map, pipeline, writeToStream } from 'streaming-iterables';

import { tunAlloc } from './tun-wrapper.cjs';
import { IpPacket } from './packets/IpPacket.js';
import { Ipv4Packet } from './packets/Ipv4Packet.js';

const INTERFACE_PATH = '/dev/net/tun';

// TODO: Consider whether we should retrieve this value from the interface
const INTERFACE_MTU = 1500;

export class TunInterface {
  private file: FileHandle;

  private constructor(file: FileHandle) {
    this.file = file;
  }

  public static async open(name: string = 'tun0'): Promise<TunInterface> {
    let interfaceFile: FileHandle;
    try {
      // TODO: Use O_NONBLOCK to avoid blocking. This requires handling EAGAIN/EWOULDBLOCK errors.
      interfaceFile = await open(INTERFACE_PATH, 'r+');
    } catch (error) {
      throw new Error('Failed to open TUN device', { cause: error });
    }

    const tunAllocResult = tunAlloc(name, interfaceFile.fd);
    if (tunAllocResult !== 0) {
      await interfaceFile.close();
      throw new Error(
        `Failed to allocate TUN device (code: ${tunAllocResult})`,
      );
    }

    return new TunInterface(interfaceFile);
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

  public async *streamPackets(): AsyncIterable<IpPacket> {
    const stream = this.file.createReadStream({
      autoClose: false,
      highWaterMark: INTERFACE_MTU,
    });
    try {
      yield* pipeline(() => stream, map(Ipv4Packet.init));
    } catch (error: any) {
      if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
        throw error;
      }
    }
  }

  public createWriter(): (packets: AsyncIterable<IpPacket>) => Promise<void> {
    const stream = this.file.createWriteStream({
      autoClose: false,
      highWaterMark: INTERFACE_MTU,
    });
    return (packets: AsyncIterable<IpPacket>) =>
      pipeline(
        () => packets,
        map((packet: IpPacket) => packet.buffer),
        writeToStream(stream),
      );
  }
}
