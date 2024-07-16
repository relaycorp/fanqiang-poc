import { TransportProtocol } from './TransportProtocol.js';
import { ServiceDataUnit } from './ServiceDataUnit.js';
import { TcpSegment } from './TcpSegment.js';
import { UdpDatagram } from './UdpDatagram.js';

export function initServiceData(
  ipPayload: Buffer,
  transportProtocol: TransportProtocol,
): ServiceDataUnit | Buffer {
  let data: ServiceDataUnit | Buffer;
  switch (transportProtocol) {
    case TransportProtocol.TCP:
      data = new TcpSegment(ipPayload);
      break;
    case TransportProtocol.UDP:
      data = new UdpDatagram(ipPayload);
      break;
    default:
      data = ipPayload;
      break;
  }
  return data;
}
