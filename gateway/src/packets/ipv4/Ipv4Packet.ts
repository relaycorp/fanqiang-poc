import { InvalidPacketError } from '../InvalidPacketError.js';
import { IpPacket } from '../IpPacket.js';
import { calculateChecksum } from '../../utils/ip.js';
import { Ipv4Address } from './Ipv4Address.js';

const MIN_IPV4_PACKET_LENGTH = 20;
const MIN_IHL = 5;

enum HeaderFieldIndex {
  IHL = 0,
  TOTAL_LENGTH = 2,
  CHECKSUM = 10,
  SOURCE_ADDRESS = 12,
  DESTINATION_ADDRESS = 16,
}

function getIhl(packet: Buffer) {
  return packet[HeaderFieldIndex.IHL] & 0x0f;
}

/**
 * IPv4 packet.
 *
 * These instances are mutable, so avoid passing them around.
 */
export class Ipv4Packet extends IpPacket<Ipv4Address> {
  constructor(buffer: Buffer) {
    super(buffer);

    if (buffer.length < MIN_IPV4_PACKET_LENGTH) {
      throw new InvalidPacketError('Buffer is too small');
    }

    const ihl = getIhl(buffer);
    if (ihl < MIN_IHL) {
      throw new InvalidPacketError('Header is too small');
    }

    const totalLength = buffer.readUInt16BE(HeaderFieldIndex.TOTAL_LENGTH);
    if (buffer.length < totalLength) {
      throw new InvalidPacketError('Buffer is smaller than total length');
    }
  }

  private getHeaderLength() {
    // Length = IHL × 32 (bits) / 8 (bytes) = IHL × 4
    return getIhl(this.buffer) * 4;
  }

  private getHeaderBuffer(): Buffer {
    const headerLength = this.getHeaderLength();
    return this.buffer.subarray(0, headerLength);
  }

  public recalculateChecksum(): void {
    const header = this.getHeaderBuffer();
    header.writeUInt16BE(0, HeaderFieldIndex.CHECKSUM);
    const newChecksum = calculateChecksum(header);
    header.writeUInt16BE(newChecksum, HeaderFieldIndex.CHECKSUM);
  }

  public override getPayload(): Buffer {
    const payloadOffset = this.getHeaderLength();
    return this.buffer.subarray(payloadOffset);
  }

  override getSourceAddress(): Ipv4Address {
    const addressBuffer = this.buffer.subarray(
      HeaderFieldIndex.SOURCE_ADDRESS,
      HeaderFieldIndex.SOURCE_ADDRESS + 4,
    );
    return new Ipv4Address(addressBuffer);
  }

  override getDestinationAddress(): Ipv4Address {
    const addressBuffer = this.buffer.subarray(
      HeaderFieldIndex.DESTINATION_ADDRESS,
      HeaderFieldIndex.DESTINATION_ADDRESS + 4,
    );
    return new Ipv4Address(addressBuffer);
  }
}
