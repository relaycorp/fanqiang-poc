import { Transform } from 'node:stream';
import { Logger } from 'pino';

import type { Ipv4Or6Packet } from '../ip/ipv4Or6.js';
import { padMessage } from './obfuscation/messages.js';

export class InternetToTunnelTransform extends Transform {
  constructor(protected readonly logger: Logger) {
    super({ objectMode: true });
  }

  override _transform(
    packet: Ipv4Or6Packet,
    _encoding: string,
    callback: () => void,
  ) {
    if (packet.getSourceAddress().isPrivate()) {
      this.logger.info(
        { packet },
        'Dropping packet from Internet: Source is private',
      );
      return callback();
    }

    this.logger.debug(
      { packet },
      'Forwarding packet from the Internet to the tunnel',
    );
    const packetPadded = padMessage(packet.buffer);
    this.push(packetPadded);
    callback();
  }
}
