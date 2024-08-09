import { hrtime } from 'node:process';
import { setTimeout } from 'node:timers/promises';

import { calculateChecksum } from '../ip/checksum.js';
import { Ipv4Address } from '../ip/ipv4/Ipv4Address.js';
import { Ipv4Packet } from '../ip/ipv4/Ipv4Packet.js';
import { runTest } from './utils/runner.js';
import type { Ipv4Or6Address } from '../ip/ipv4Or6.js';
import { Ipv6Packet } from '../ip/ipv6/Ipv6Packet.js';
import { Ipv6Address } from '../ip/ipv6/Ipv6Address.js';
import { IpProtocol } from '../ip/IpProtocol.js';

const PING_INTERVAL_SECONDS = 3;

// ICMP echo (ping) payload
const BASE_ICMP_PAYLOAD = Buffer.from([
  0x08, 0x00, 0x00, 0x00, 0x00, 0x01, 0x0a, 0x09, 0x61, 0x62, 0x63, 0x64, 0x65,
  0x66, 0x67, 0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x70, 0x71, 0x72,
  0x73, 0x74, 0x75, 0x76, 0x77, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68,
  0x69,
]);

function makeIcmpV4Payload(): Buffer {
  const icmpPayload = Buffer.allocUnsafe(BASE_ICMP_PAYLOAD.length);
  icmpPayload.writeUInt16BE(0, 2);
  BASE_ICMP_PAYLOAD.copy(icmpPayload);
  icmpPayload.writeUInt16BE(calculateChecksum(icmpPayload), 2);
  return icmpPayload;
}

function makeIcmpV6Payload(
  sourceAddress: Ipv6Address,
  destinationAddress: Ipv6Address,
): Buffer {
  const icmpPayload = Buffer.allocUnsafe(BASE_ICMP_PAYLOAD.length);
  BASE_ICMP_PAYLOAD.copy(icmpPayload);
  icmpPayload.writeUInt8(128, 0); // ICMPv6 type (echo request)
  icmpPayload.writeUInt16BE(0, 2); // Clear checksum field

  // Create IPv6 pseudo-header
  const pseudoHeader = Buffer.alloc(40);
  sourceAddress.buffer.copy(pseudoHeader, 0);
  destinationAddress.buffer.copy(pseudoHeader, 16);
  pseudoHeader.writeUInt32BE(icmpPayload.length, 32); // Upper-layer packet length
  pseudoHeader.writeUInt32BE(IpProtocol.IPV6_ICMP, 36);

  // Calculate checksum including pseudo-header
  const checksum = calculateChecksum(pseudoHeader, icmpPayload);
  icmpPayload.writeUInt16BE(checksum, 2);

  return icmpPayload;
}

function makePing(
  sourceAddress: Ipv4Or6Address,
  destinationAddress: Ipv4Or6Address,
) {
  let packet;
  if (sourceAddress instanceof Ipv4Address) {
    packet = Ipv4Packet.create(
      sourceAddress,
      destinationAddress as Ipv4Address,
      1, // ICMP
      makeIcmpV4Payload(),
    );
  } else {
    const icmpv6Payload = makeIcmpV6Payload(
      sourceAddress as Ipv6Address,
      destinationAddress as Ipv6Address,
    );
    packet = Ipv6Packet.create(
      sourceAddress as Ipv6Address,
      destinationAddress as Ipv6Address,
      58, // ICMPv6
      icmpv6Payload,
    );
  }
  return packet;
}

await runTest(
  async (sourceAddress, destinationAddress, gatewayClient, logger) => {
    while (true) {
      const ping = makePing(sourceAddress, destinationAddress);
      const startTime = hrtime.bigint();
      await gatewayClient.sendPacket(ping);
      logger.info({ packet: ping }, 'Sent ping');

      const pong = await gatewayClient.readNextPacket();
      const endTime = hrtime.bigint();
      const elapsedMs = Number(endTime - startTime) / 1_000_000;
      if (sourceAddress.equals(pong.getDestinationAddress())) {
        logger.info({ packet: pong, elapsedMs }, 'Received pong');
      } else {
        logger.error({ packet: pong }, 'Invalid destination');
      }

      await setTimeout(PING_INTERVAL_SECONDS * 1_000);
    }
  },
);
