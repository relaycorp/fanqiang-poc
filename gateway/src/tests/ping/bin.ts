import { consume, map, pipeline, tap } from 'streaming-iterables';

import { calculateChecksum } from '../../ip/checksum.js';
import { Ipv4Address } from '../../ip/ipv4/Ipv4Address.js';
import { Ipv4Packet } from '../../ip/ipv4/Ipv4Packet.js';
import { connectToGateway } from '../client.js';
import { Ipv4OrIpv6Packet } from '../../ip/Ipv4OrIpv6Packet.js';

const PING_INTERVAL_SECONDS = 3;

// ICMP echo (ping)
const ICMP_PACKET = Buffer.from([
  0x08, 0x00, 0x00, 0x00, 0x00, 0x01, 0x0a, 0x09, 0x61, 0x62, 0x63, 0x64, 0x65,
  0x66, 0x67, 0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x70, 0x71, 0x72,
  0x73, 0x74, 0x75, 0x76, 0x77, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68,
  0x69,
]);
ICMP_PACKET.writeUInt16BE(calculateChecksum(ICMP_PACKET), 2);

async function* producePingPackets(
  sourceAddress: Ipv4Address,
  destinationAddress: Ipv4Address,
): AsyncGenerator<Ipv4OrIpv6Packet, void> {
  let timeoutId: NodeJS.Timeout | null = null;
  try {
    while (true) {
      yield Ipv4Packet.create(
        sourceAddress,
        destinationAddress,
        1, // ICMP
        ICMP_PACKET,
      );
      await new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, PING_INTERVAL_SECONDS * 1_000);
      });
    }
  } finally {
    // noinspection PointlessBooleanExpressionJS
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

await connectToGateway(
  async (
    incomingPackets,
    outgoingPacketsSink,
    sourceAddress,
    destinationAddress,
  ) => {
    const pingPackets = producePingPackets(sourceAddress, destinationAddress);
    const sendPingPackets = pipeline(
      () => pingPackets,
      tap((packet) => console.log(`↑ ${packet}`)),
      outgoingPacketsSink,
    );
    const processPongPackets = pipeline(
      () => incomingPackets,
      map((packet) => console.log(`↓ ${packet}`)),
      consume,
    );
    try {
      await Promise.all([sendPingPackets, processPongPackets]);
    } finally {
      await pingPackets.return();
    }
  },
);
