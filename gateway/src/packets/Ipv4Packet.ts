import { InvalidPacketError } from './InvalidPacketError.js';
import { IpPacket } from './IpPacket.js';
import { calculateChecksum } from '../utils/ip.js';

const MIN_IPV4_PACKET_LENGTH = 20;
const MIN_IHL = 5;

function getIhl(packet: Buffer) {
  return packet[0] & 0x0f;
}

export class Ipv4Packet extends IpPacket {
  static init(buffer: Buffer): Ipv4Packet {
    if (buffer.length < MIN_IPV4_PACKET_LENGTH) {
      throw new InvalidPacketError('Buffer is too small');
    }

    const ipVersion = buffer[0] >> 4;
    if (ipVersion !== 4) {
      throw new InvalidPacketError(`Invalid IP version (${ipVersion})`);
    }

    const ihl = getIhl(buffer);
    if (ihl < MIN_IHL) {
      throw new InvalidPacketError('Header is too small');
    }

    const totalLength = buffer.readUInt16BE(2);
    if (buffer.length < totalLength) {
      throw new InvalidPacketError('Buffer is smaller than total length');
    }

    return new Ipv4Packet(buffer);
  }

  private getHeaderBuffer(): Buffer {
    // Length = IHL × 32 (bits) / 8 (bytes) = IHL × 4
    const headerLength = getIhl(this.buffer) * 4;
    return this.buffer.subarray(0, headerLength);
  }

  public recalculateChecksum(): void {
    const header = this.getHeaderBuffer();
    header.writeUInt16BE(0, 10);
    const newChecksum = calculateChecksum(header);
    header.writeUInt16BE(newChecksum, 10);
  }
}
