import { pino, Logger, Level } from 'pino';
import pretty from 'pino-pretty';

import { IpPacket } from '../ip/IpPacket.js';
import { IpAddress } from '../ip/IpAddress.js';

const DEFAULT_LOG_LEVEL: Level = 'info';

export function createLogger(): Logger {
  const stream = pretty();
  const level = process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL;
  return pino(
    {
      level,
      serializers: {
        err: pino.stdSerializers.err,
        packet: (packet: IpPacket<any>) => {
          return packet.toString();
        },
        ipAddress: (ipAddress: IpAddress<any>) => {
          return ipAddress.toString();
        },
      },
    },
    stream,
  );
}
