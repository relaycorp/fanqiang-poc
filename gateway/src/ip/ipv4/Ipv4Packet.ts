import { InvalidPacketError } from '../InvalidPacketError.js';
import { IpPacket } from '../IpPacket.js';
import { calculateChecksum } from '../checksum.js';
import { Ipv4Address } from './Ipv4Address.js';
import { IpPacketValidation } from '../IpPacketValidation.js';
import { ForwardingSide } from '../../nat/ForwardingSide.js';

const MIN_IPV4_PACKET_LENGTH = 20;
const MIN_IHL = 5;

enum HeaderFieldIndex {
  IHL = 0,
  TOTAL_LENGTH = 2,
  TTL = 8,
  PROTOCOL = 9,
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

  protected override getHopLimit(): number {
    return this.buffer[HeaderFieldIndex.TTL];
  }

  protected override decrementHopLimit(): void {
    const hopLimit = this.getHopLimit();
    this.buffer.writeUInt8(hopLimit - 1, HeaderFieldIndex.TTL);
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

  public override getPayload(): Buffer {
    const payloadOffset = this.getHeaderLength();
    return this.buffer.subarray(payloadOffset);
  }

  protected isChecksumValid(): boolean {
    const originalChecksum = this.buffer.readUInt16BE(
      HeaderFieldIndex.CHECKSUM,
    );
    this.buffer.writeUInt16BE(0, HeaderFieldIndex.CHECKSUM);
    const finalChecksum = this.recalculateChecksum();
    if (originalChecksum !== finalChecksum) {
      this.buffer.writeUInt16BE(originalChecksum, HeaderFieldIndex.CHECKSUM);
    }
    return originalChecksum === finalChecksum;
  }

  public override validate(): IpPacketValidation {
    if (!this.isChecksumValid()) {
      return IpPacketValidation.INVALID_CHECKSUM;
    }
    return super.validate();
  }

  public override prepareForForwarding(
    side: ForwardingSide,
    address: Ipv4Address,
  ) {
    super.prepareForForwarding(side, address);
    this.recalculateChecksum();
  }
}
