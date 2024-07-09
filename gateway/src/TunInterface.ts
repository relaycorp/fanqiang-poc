import { open, FileHandle } from 'node:fs/promises';

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
      throw new Error(`Failed to allocate TUN device (code: ${tunAllocResult})`);
    }

    return new TunInterface(interfaceFile);
  }

  public async close(): Promise<void> {
    await this.file.close();
  }

  private async readNextPacket(
    signal: AbortSignal,
    buffer: Buffer,
  ): Promise<Buffer | null> {
    return Promise.race([
      new Promise<null>((resolve) => {
        const abort = () => {
          resolve(null);
        };
        // TODO: Remove the listener when the OTHER promise is resolved
        signal.addEventListener('abort', abort, { once: true });
      }),

      new Promise<Buffer>(async (resolve, reject) => {
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
      }),
    ]);
  }

  public async *streamPackets(signal: AbortSignal): AsyncIterable<Buffer> {
    const buffer = Buffer.allocUnsafe(INTERFACE_MTU);
    while (!signal.aborted) {
      const packet = await this.readNextPacket(signal, buffer);
      if (packet === null) {
        break;
      }
      yield packet;
    }
  }
}
