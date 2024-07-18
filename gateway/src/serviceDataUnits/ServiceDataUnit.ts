import { ServiceDataValidation } from './ServiceDataValidation.js';
import { IpChecksumContext } from './checksums/IpChecksumContext.js';
import { makePseudoHeader } from './checksums/pseudoHeader.js';
import { calculateChecksum } from '../protocolDataUnits/checksum.js';

export abstract class ServiceDataUnit {
  constructor(public buffer: Buffer) {}

  protected abstract protocolName: string;
  protected abstract protocolNumber: number;

  protected abstract minSize: number;

  protected abstract sourcePortOffset: number;
  protected abstract destinationPortOffset: number;
  protected abstract checksumOffset: number;

  public getSourcePort(): number {
    return this.buffer.readUInt16BE(this.sourcePortOffset);
  }

  public setSourcePort(port: number): void {
    this.buffer.writeUInt16BE(port, this.sourcePortOffset);
  }

  public getDestinationPort(): number {
    return this.buffer.readUInt16BE(this.destinationPortOffset);
  }

  public setDestinationPort(port: number): void {
    this.buffer.writeUInt16BE(port, this.destinationPortOffset);
  }

  protected getChecksum(): number {
    return this.buffer.readUInt16BE(this.checksumOffset);
  }

  protected setChecksum(checksum: number): void {
    this.buffer.writeUInt16BE(checksum, this.checksumOffset);
  }

  /**
   * Recalculate the checksum of the SDU and updates it in place.
   */
  public recalculateChecksum(context: IpChecksumContext): number {
    const pseudoHeader = makePseudoHeader(
      this.buffer.length,
      this.protocolNumber,
      context,
    );
    this.setChecksum(0);
    const checksum = calculateChecksum(pseudoHeader, this.buffer);
    this.setChecksum(checksum);
    return checksum;
  }

  /**
   * Check if the checksum of the packet is valid.
   */
  protected isChecksumValid(context: IpChecksumContext): boolean {
    const originalChecksum = this.getChecksum();
    const finalChecksum = this.recalculateChecksum(context);
    const isValid = originalChecksum === finalChecksum;
    if (!isValid) {
      this.setChecksum(originalChecksum);
    }
    return isValid;
  }

  public validate(context: IpChecksumContext): ServiceDataValidation {
    if (this.buffer.length < this.minSize) {
      return ServiceDataValidation.MALFORMED;
    }

    return this.isChecksumValid(context)
      ? ServiceDataValidation.VALID
      : ServiceDataValidation.INVALID_CHECKSUM;
  }

  public toString(): string {
    return `${this.protocolName} ${this.getSourcePort()}→${this.getDestinationPort()} (${this.buffer.length} octets)`;
  }
}
