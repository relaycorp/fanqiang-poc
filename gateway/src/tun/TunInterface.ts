import { open, FileHandle } from 'node:fs/promises';
import Cidr from 'ip-cidr';
import { map, pipeline, writeToStream } from 'streaming-iterables';

import { tunAlloc } from './tunWrapper.js';
import { initPacket } from '../ip/packets.js';
import { Ipv4Or6Packet } from '../ip/Ipv4Or6Packet.js';
import { Ipv4Or6Address } from '../ip/Ipv4Or6Address.js';

const INTERFACE_PATH = '/dev/net/tun';

const SUBNET_MASK = 27;

export class TunInterface {
  private readonly file: FileHandle;

  private readonly subnetCidr: Cidr;

  private constructor(
    file: FileHandle,
    public readonly id: number,
  ) {
    this.file = file;

    const subnet = `10.0.${100 + id}.0/${SUBNET_MASK}`;
    this.subnetCidr = new Cidr(subnet);
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
    });
    try {
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
    });
    return (packets) =>
      pipeline(
        () => packets,
        map((packet) => packet.buffer),
        writeToStream(stream),
      );
  }

  public get subnet(): string {
    return this.subnetCidr.toString();
  }

  public subnetContainsAddress(address: Ipv4Or6Address): boolean {
    return this.subnetCidr.contains(address.toString());
  }
}
