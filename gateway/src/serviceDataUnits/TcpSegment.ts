import { ServiceDataUnit } from './ServiceDataUnit.js';
import { calculateChecksum } from '../ip/checksum.js';
import { IpChecksumContext } from './checksums/IpChecksumContext.js';
import { TransportProtocol } from './TransportProtocol.js';
import { makePseudoHeader } from './checksums/pseudoHeader.js';

export class TcpSegment extends ServiceDataUnit {
  protected override readonly protocolName = 'TCP';

  protected override readonly minSize = 20;

  protected override readonly sourcePortOffset = 0;
  protected override readonly destinationPortOffset = 2;
  protected override readonly checksumOffset = 16;

  override recalculateChecksum(context: IpChecksumContext): number {
    const pseudoHeader = makePseudoHeader(
      this.buffer.length,
      TransportProtocol.TCP,
      context,
    );
    this.setChecksum(0);
    const checksum = calculateChecksum(pseudoHeader, this.buffer);
    this.setChecksum(checksum);
    return checksum;
  }
}
