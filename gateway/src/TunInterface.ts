import { open, FileHandle } from 'node:fs/promises';
import { writeToStream } from 'streaming-iterables';

import { tunAlloc } from './tun-wrapper.cjs';

const INTERFACE_PATH = '/dev/net/tun';
const INTERFACE_MTU = 1500;

export class TunInterface {
  private file: FileHandle;

  private constructor(file: FileHandle) {
    this.file = file;
  }

  public static async open(name: string = 'tun0'): Promise<TunInterface> {
    let interfaceFile: FileHandle;
    try {
      // POC: Use O_NONBLOCK to avoid blocking. This requires handling EAGAIN/EWOULDBLOCK errors,
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
    await this.file.close();
  }

  private async readNextPacketOrAbort(
    buffer: Buffer,
    signal: AbortSignal,
  ): Promise<Buffer | null> {
    let removeAbortHandler: () => void;

    const abortPromise = new Promise<null>((resolve) => {
      const abort = () => {
        resolve(null);
      };
      signal.addEventListener('abort', abort, { once: true });
      removeAbortHandler = () => signal.removeEventListener('abort', abort);
    });

    const packetPromise = this.readNextPacket(buffer).finally(() =>
      removeAbortHandler(),
    );

    return Promise.race([abortPromise, packetPromise]);
  }

  private readNextPacket(buffer: Buffer) {
    return new Promise<Buffer>(async (resolve, reject) => {
      try {
        const { bytesRead } = await this.file.read(
          buffer,
          0,
          buffer.length,
          null,
        );

        // Return a copy of the packet instead of a reference within `buffer`,
        // as the buffer will be reused for subsequent packets.
        const packet = Buffer.allocUnsafe(bytesRead);
        buffer.copy(packet, 0, 0, bytesRead);
        resolve(packet);
      } catch (error) {
        reject(new Error('Failed to read packet', { cause: error }));
      }
    });
  }

  public async *streamPackets(signal: AbortSignal): AsyncIterable<Buffer> {
    const buffer = Buffer.allocUnsafe(INTERFACE_MTU);
    while (!signal.aborted) {
      const packet = await this.readNextPacketOrAbort(buffer, signal);
      console.log('Received packet!!!', packet?.byteLength);
      if (packet === null) {
        break;
      }
      yield packet;
    }
  }

  public createWriter(): (packets: AsyncIterable<Buffer>) => Promise<void> {
    const stream = this.file.createWriteStream({
      autoClose: false,
      emitClose: false,
      highWaterMark: INTERFACE_MTU,
    });
    return writeToStream(stream);
  }
}
