import { FileHandle, open } from 'node:fs/promises';
import { Readable, Transform, Writable } from 'node:stream';

import { tunAlloc } from './tunWrapper.js';
import { initPacket, Ipv4Or6Address, Ipv4Or6Packet } from '../ip/ipv4Or6.js';
import { Ipv4Address } from '../ip/ipv4/Ipv4Address.js';
import { Ipv6Address } from '../ip/ipv6/Ipv6Address.js';
import { Ipv4SubnetSet } from '../ip/ipv4/Ipv4SubnetSet.js';
import { Ipv6SubnetSet } from '../ip/ipv6/Ipv6SubnetSet.js';

const INTERFACE_PATH = '/dev/net/tun';

const IPV4_SUBNET_MASK = 24;
const IPV6_SUBNET_MASK = 120;

export class TunInterface {
  private readonly file: FileHandle;
  private readStream: Readable;
  private writeStream: Writable;

  public readonly ipv4Subnet: string;
  private readonly ipv4SubnetSet: Ipv4SubnetSet;

  public readonly ipv6Subnet: string;
  private readonly ipv6SubnetSet: Ipv6SubnetSet;

  private constructor(
    file: FileHandle,
    public readonly id: number,
  ) {
    this.file = file;
    this.readStream = this.file.createReadStream({ autoClose: false });
    this.writeStream = this.file.createWriteStream({ autoClose: false });

    const ipv4SubnetStartAddress = Ipv4Address.fromString(`10.0.${100 + id}.0`);
    this.ipv4Subnet = `${ipv4SubnetStartAddress}/${IPV4_SUBNET_MASK}`;
    this.ipv4SubnetSet = new Ipv4SubnetSet([
      {
        address: Array.from(ipv4SubnetStartAddress.buffer),
        mask: IPV4_SUBNET_MASK,
      },
    ]);

    const ipv6SubnetStartAddress = Ipv6Address.fromString(`fd00:1234::${id}:0`);
    this.ipv6Subnet = `${ipv6SubnetStartAddress}/${IPV6_SUBNET_MASK}`;
    this.ipv6SubnetSet = new Ipv6SubnetSet([
      {
        address: Array.from(ipv6SubnetStartAddress.buffer),
        mask: IPV6_SUBNET_MASK,
      },
    ]);
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
    this.readStream.destroy();
    this.writeStream.destroy();

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

  public createReader(): Readable {
    return this.readStream.pipe(
      new Transform({
        objectMode: true,
        transform: function (chunk: Buffer, _encoding, callback) {
          let packet: Ipv4Or6Packet;
          try {
            packet = initPacket(chunk);
          } catch (error) {
            callback(
              new Error('Failed to initialise packet', { cause: error }),
            );
            return;
          }

          this.push(packet);
          callback();
        },
      }),
    );
  }

  public createWriter(): Writable {
    return new Writable({
      objectMode: true,
      write: (packet: Ipv4Or6Packet, _encoding, callback) => {
        this.writeStream.write(packet.buffer, callback);
      },
    });
  }

  public subnetContainsAddress(address: Ipv4Or6Address): boolean {
    const addressParts = Array.from(address.buffer);
    const subnetSet =
      address instanceof Ipv4Address ? this.ipv4SubnetSet : this.ipv6SubnetSet;
    return subnetSet.contains(addressParts);
  }
}
