import { ServiceDataUnit } from './ServiceDataUnit.js';
import { IpChecksumContext } from './checksums/IpChecksumContext.js';
import { TransportProtocol } from './TransportProtocol.js';
import { makePseudoHeader } from './checksums/pseudoHeader.js';
import { calculateChecksum } from '../ip/checksum.js';

export class UdpDatagram extends ServiceDataUnit {
  protected override readonly protocolName = 'UDP';

  protected override readonly minSize = 8;

  protected override readonly sourcePortOffset = 0;
  protected override readonly destinationPortOffset = 2;
  protected override readonly checksumOffset = 6;

  public recalculateChecksum(context: IpChecksumContext): number {
    const pseudoHeader = makePseudoHeader(
      this.buffer.length,
      TransportProtocol.UDP,
      context,
    );
    this.setChecksum(0);
    const checksum = calculateChecksum(pseudoHeader, this.buffer);
    this.setChecksum(checksum);
    return checksum;
  }
}
