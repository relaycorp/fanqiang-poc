import { ServiceDataUnit } from './ServiceDataUnit.js';
import { TransportProtocol } from './TransportProtocol.js';

enum HeaderFieldIndex {
  SOURCE_PORT = 0,
  DESTINATION_PORT = 2,
  CHECKSUM = 16,
}

export class TcpSegment extends ServiceDataUnit {
  protected override readonly protocolName = 'TCP';
  protected override readonly protocolNumber = TransportProtocol.TCP;

  protected override readonly minSize = 20;

  protected override readonly sourcePortOffset = HeaderFieldIndex.SOURCE_PORT;
  protected override readonly destinationPortOffset =
    HeaderFieldIndex.DESTINATION_PORT;
  protected override readonly checksumOffset = HeaderFieldIndex.CHECKSUM;
}
