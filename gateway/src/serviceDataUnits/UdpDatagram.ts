import { ServiceDataUnit } from './ServiceDataUnit.js';
import { TransportProtocol } from './TransportProtocol.js';

export class UdpDatagram extends ServiceDataUnit {
  protected override readonly protocolName = 'UDP';
  protected override readonly protocolNumber = TransportProtocol.UDP;

  protected override readonly minSize = 8;

  protected override readonly sourcePortOffset = 0;
  protected override readonly destinationPortOffset = 2;
  protected override readonly checksumOffset = 6;
}
