import { TransportProtocol } from '../TransportProtocol.js';
import { IpChecksumContext } from './IpChecksumContext.js';
import { Ipv6Address } from '../../ip/ipv6/Ipv6Address.js';

export function makePseudoHeader(
  sduLength: number,
  protocol: TransportProtocol,
  context: IpChecksumContext,
): Buffer {
  if (context.sourceAddress instanceof Ipv6Address) {
    throw new Error('IPv6 is not supported yet');
  }

  const pseudoHeader = Buffer.allocUnsafe(12);

  context.sourceAddress.buffer.copy(pseudoHeader, 0);
  context.destinationAddress.buffer.copy(pseudoHeader, 4);

  // The useless zero octet required by RFC 9293
  pseudoHeader.writeUInt8(0, 8);

  pseudoHeader.writeUInt8(protocol, 9);

  pseudoHeader.writeUInt16BE(sduLength, 10);

  return pseudoHeader;
}
