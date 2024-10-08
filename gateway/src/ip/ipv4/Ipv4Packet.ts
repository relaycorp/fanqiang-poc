import { InvalidPacketError } from '../InvalidPacketError.js';
import { IpPacket } from '../IpPacket.js';
import { calculateChecksum } from '../checksum.js';
import { Ipv4Address } from './Ipv4Address.js';

const MIN_IPV4_PACKET_LENGTH = 20;
const MIN_IHL = 5;

enum HeaderFieldIndex {
  VERSION_AND_IHL = 0,
  DSCP_AND_ECN = 1,
  TOTAL_LENGTH = 2,
  IDENTIFICATION = 4,
  FLAGS_AND_FRAGMENT_OFFSET = 6,
  TTL = 8,
  PROTOCOL = 9,
  CHECKSUM = 10,
  SOURCE_ADDRESS = 12,
  DESTINATION_ADDRESS = 16,
}

function getIhl(packet: Buffer) {
  return packet[HeaderFieldIndex.VERSION_AND_IHL] & 0x0f;
}

/**
 * IPv4 packet.
 *
 * These instances are mutable, so avoid passing them around.
 */
export class Ipv4Packet extends IpPacket<Ipv4Address> {
  public static create(
    sourceAddress: Ipv4Address,
    destinationAddress: Ipv4Address,
    protocol: number,
    payload: Buffer,
  ): Ipv4Packet {
    const buffer = Buffer.alloc(MIN_IPV4_PACKET_LENGTH + payload.length);
    buffer[HeaderFieldIndex.VERSION_AND_IHL] = 0x45; // Version 4, IHL 5
    buffer[HeaderFieldIndex.DSCP_AND_ECN] = 0x00;
    buffer.writeUInt16BE(buffer.length, HeaderFieldIndex.TOTAL_LENGTH);
    buffer.writeUInt16BE(0x1234, HeaderFieldIndex.IDENTIFICATION);
    buffer.writeUInt16BE(0x4000, HeaderFieldIndex.FLAGS_AND_FRAGMENT_OFFSET);
    buffer[HeaderFieldIndex.TTL] = 64;
    buffer[HeaderFieldIndex.PROTOCOL] = protocol;
    payload.copy(buffer, MIN_IPV4_PACKET_LENGTH);

    const packet = new Ipv4Packet(buffer);
    packet.setSourceAddress(sourceAddress);
    packet.setDestinationAddress(destinationAddress);
    packet.recalculateChecksum();

    return packet;
  }

  constructor(buffer: Buffer) {
    super(buffer);

    if (buffer.length < MIN_IPV4_PACKET_LENGTH) {
      throw new InvalidPacketError('Buffer is too small');
    }

    const ihl = getIhl(buffer);
    if (ihl < MIN_IHL) {
      throw new InvalidPacketError('IHL is too small');
    }

    const totalLength = buffer.readUInt16BE(HeaderFieldIndex.TOTAL_LENGTH);
    if (buffer.length < totalLength) {
      throw new InvalidPacketError('Buffer is smaller than total length');
    }
  }

  public override getTransportProtocol(): number {
    return this.buffer[HeaderFieldIndex.PROTOCOL];
  }

  private getHeaderLength() {
    // Length = IHL × 32 (bits) / 8 (bytes) = IHL × 4
    return getIhl(this.buffer) * 4;
  }

  private getHeaderBuffer(): Buffer {
    const headerLength = this.getHeaderLength();
    return this.buffer.subarray(0, headerLength);
  }

  public recalculateChecksum(): number {
    const header = this.getHeaderBuffer();
    header.writeUInt16BE(0, HeaderFieldIndex.CHECKSUM);
    const newChecksum = calculateChecksum(header);
    header.writeUInt16BE(newChecksum, HeaderFieldIndex.CHECKSUM);
    return newChecksum;
  }

  override getSourceAddress(): Ipv4Address {
    const addressBuffer = this.buffer.subarray(
      HeaderFieldIndex.SOURCE_ADDRESS,
      HeaderFieldIndex.SOURCE_ADDRESS + Ipv4Address.OCTETS_LENGTH,
    );
    return new Ipv4Address(addressBuffer);
  }

  override setSourceAddress(newIpAddress: Ipv4Address): void {
    newIpAddress.buffer.copy(this.buffer, HeaderFieldIndex.SOURCE_ADDRESS);
  }

  override getDestinationAddress(): Ipv4Address {
    const addressBuffer = this.buffer.subarray(
      HeaderFieldIndex.DESTINATION_ADDRESS,
      HeaderFieldIndex.DESTINATION_ADDRESS + Ipv4Address.OCTETS_LENGTH,
    );
    return new Ipv4Address(addressBuffer);
  }

  override setDestinationAddress(newIpAddress: Ipv4Address): void {
    newIpAddress.buffer.copy(this.buffer, HeaderFieldIndex.DESTINATION_ADDRESS);
  }
}
