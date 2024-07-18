import { hrtime } from 'node:process';
import { setTimeout } from 'node:timers/promises';

import { calculateChecksum } from '../protocolDataUnits/checksum.js';
import { Ipv4Address } from '../protocolDataUnits/ipv4/Ipv4Address.js';
import { Ipv4Packet } from '../protocolDataUnits/ipv4/Ipv4Packet.js';
import { runTest } from './utils/runner.js';

const PING_INTERVAL_SECONDS = 3;

// ICMP echo (ping)
const ICMP_PACKET = Buffer.from([
  0x08, 0x00, 0x00, 0x00, 0x00, 0x01, 0x0a, 0x09, 0x61, 0x62, 0x63, 0x64, 0x65,
  0x66, 0x67, 0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x70, 0x71, 0x72,
  0x73, 0x74, 0x75, 0x76, 0x77, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68,
  0x69,
]);
ICMP_PACKET.writeUInt16BE(calculateChecksum(ICMP_PACKET), 2);

function makePing(sourceAddress: Ipv4Address, destinationAddress: Ipv4Address) {
  return Ipv4Packet.create(
    sourceAddress,
    destinationAddress,
    1, // ICMP
    ICMP_PACKET,
  );
}

await runTest(async (sourceAddress, destinationAddress, gatewayClient) => {
  while (true) {
    const ping = makePing(sourceAddress, destinationAddress);
    const startTime = hrtime.bigint();
    await gatewayClient.sendPacket(ping);
    console.log(`↑ ${ping}`);

    const pong = await gatewayClient.readNextPacket();
    const endTime = hrtime.bigint();
    const elapsedMs = Number(endTime - startTime) / 1_000_000;
    console.log(`↓ ${pong} (${elapsedMs.toFixed(2)}ms)`);

    await setTimeout(PING_INTERVAL_SECONDS * 1_000);
  }
});
