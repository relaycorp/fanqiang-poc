import { ServiceDataUnit } from './ServiceDataUnit.js';
import { TransportProtocol } from './TransportProtocol.js';
import { IpChecksumContext } from './checksums/IpChecksumContext.js';

enum HeaderFieldIndex {
  SOURCE_PORT = 0,
  DESTINATION_PORT = 2,
  SEQUENCE_NUMBER = 4,
  ACKNOWLEDGMENT_NUMBER = 8,
  DATA_OFFSET_AND_FLAGS = 12,
  WINDOW_SIZE = 14,
  CHECKSUM = 16,
  URGENT_POINTER = 18,
}

export enum TcpFlag {
  FIN = 0x01,
  SYN = 0x02,
  ACK = 0x10,
}

export class TcpSegment extends ServiceDataUnit {
  protected override readonly protocolName = 'TCP';
  protected override readonly protocolNumber = TransportProtocol.TCP;

  protected override readonly minSize = 20;

  protected override readonly sourcePortOffset = HeaderFieldIndex.SOURCE_PORT;
  protected override readonly destinationPortOffset =
    HeaderFieldIndex.DESTINATION_PORT;
  protected override readonly checksumOffset = HeaderFieldIndex.CHECKSUM;

  public static create(
    sourcePort: number,
    destinationPort: number,
    sequenceNumber: number,
    acknowledgmentNumber: number,
    flags: readonly TcpFlag[],
    windowSize: number,
    checksumContext: IpChecksumContext,
    payload?: Buffer,
  ): TcpSegment {
    const headerSize = 20;
    const totalSize = headerSize + (payload?.length ?? 0);
    const buffer = Buffer.alloc(totalSize);

    buffer.writeUInt16BE(sourcePort, HeaderFieldIndex.SOURCE_PORT);
    buffer.writeUInt16BE(destinationPort, HeaderFieldIndex.DESTINATION_PORT);
    buffer.writeUInt32BE(sequenceNumber, HeaderFieldIndex.SEQUENCE_NUMBER);
    buffer.writeUInt32BE(
      acknowledgmentNumber,
      HeaderFieldIndex.ACKNOWLEDGMENT_NUMBER,
    );

    const flagsInt = flags.reduce((acc, flag) => acc | flag, 0);
    buffer.writeUInt16BE(
      (5 << 12) | flagsInt,
      HeaderFieldIndex.DATA_OFFSET_AND_FLAGS,
    );

    buffer.writeUInt16BE(windowSize, HeaderFieldIndex.WINDOW_SIZE);
    buffer.writeUInt16BE(0, HeaderFieldIndex.CHECKSUM);
    buffer.writeUInt16BE(0, HeaderFieldIndex.URGENT_POINTER);

    if (payload) {
      payload.copy(buffer, headerSize);
    }

    const segment = new TcpSegment(buffer);
    segment.recalculateChecksum(checksumContext);
    return segment;
  }

  public getSequenceNumber(): number {
    return this.buffer.readUInt32BE(HeaderFieldIndex.SEQUENCE_NUMBER);
  }

  public getAcknowledgmentNumber(): number {
    return this.buffer.readUInt32BE(HeaderFieldIndex.ACKNOWLEDGMENT_NUMBER);
  }
}
