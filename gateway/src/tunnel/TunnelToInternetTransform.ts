import { Transform } from 'node:stream';
import { Logger } from 'pino';

import { TunInterface } from '../tun/TunInterface.js';
import { initPacket, type Ipv4Or6Packet } from '../ip/ipv4Or6.js';

export class TunnelToInternetTransform extends Transform {
  constructor(
    private readonly tunInterface: TunInterface,
    private readonly logger: Logger,
  ) {
    super({ objectMode: true });
  }

  override _transform(chunk: Buffer, _encoding: string, callback: () => void) {
    let packet: Ipv4Or6Packet;
    try {
      packet = initPacket(chunk);
    } catch (err) {
      this.logger.info(
        { err },
        'Dropping packet from Tunnel: Malformed IP packet',
      );
      return callback();
    }

    if (packet.getDestinationAddress().isPrivate()) {
      this.logger.info(
        { packet },
        'Dropping packet from Tunnel: Destination is private',
      );
      return callback();
    }

    const sourceAddress = packet.getSourceAddress();
    if (!this.tunInterface.subnetContainsAddress(sourceAddress)) {
      this.logger.info(
        { packet },
        'Dropping packet from Tunnel: Source is outside interface subnet',
      );
      return callback();
    }
    if (!sourceAddress.isAssignable()) {
      this.logger.info(
        { packet },
        'Dropping packet from Tunnel: Source is not assignable',
      );
      return callback();
    }

    this.logger.debug({ packet }, 'Forwarding packet from tunnel to internet');
    this.push(packet);
    callback();
  }
}
