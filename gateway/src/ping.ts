import WebSocket from 'ws';

import { calculateChecksum } from './utils/ip.js';
import { Ipv4Address } from './packets/ipv4/Ipv4Address.js';
import { Ipv4Packet } from './packets/ipv4/Ipv4Packet.js';
import { initPacket } from './packets/init.js';

const GATEWAY_URL = 'ws://localhost:8080';
const SOURCE_ADDRESS = Ipv4Address.fromString('1.2.3.4');
const TARGET_ADDRESS = Ipv4Address.fromString('1.1.1.1');

// ICMP echo (ping)
const ICMP_PACKET = Buffer.from([
  0x08, 0x00, 0x00, 0x00, 0x00, 0x01, 0x0a, 0x09, 0x61, 0x62, 0x63, 0x64, 0x65,
  0x66, 0x67, 0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x70, 0x71, 0x72,
  0x73, 0x74, 0x75, 0x76, 0x77, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68,
  0x69,
]);
ICMP_PACKET.writeUInt16BE(calculateChecksum(ICMP_PACKET), 2);

const ws = new WebSocket(GATEWAY_URL);

let pingInterval: NodeJS.Timeout; // Store the interval timer

function wrapPayloadInIpv4Packet(
  sourceAddress: Ipv4Address,
  destinationAddress: Ipv4Address,
  payload: Buffer,
): Ipv4Packet {
  const buffer = Buffer.alloc(20 + payload.length);
  buffer[0] = 0x45; // Version 4, IHL 5
  buffer[1] = 0x00; // DSCP + ECN
  buffer.writeUInt16BE(buffer.length, 2); // Total length
  buffer.writeUInt16BE(0x1234, 4); // Identification
  buffer.writeUInt16BE(0x4000, 6); // Flags + Fragment offset
  buffer[8] = 64; // TTL
  buffer[9] = 0x01; // Protocol: ICMP
  payload.copy(buffer, 20);

  const packet = new Ipv4Packet(buffer);
  packet.replaceSourceAddress(sourceAddress);
  packet.replaceDestinationAddress(destinationAddress);
  packet.recalculateChecksum();

  return packet;
}

ws.on('open', () => {
  console.log('Connected to server');

  pingInterval = setInterval(() => {
    const ipPacket = wrapPayloadInIpv4Packet(
      SOURCE_ADDRESS,
      TARGET_ADDRESS,
      ICMP_PACKET,
    );
    ws.send(ipPacket.buffer);
    console.log(`↑ ${ipPacket}`);
  }, 3000);
});

ws.on('message', (data: Buffer) => {
  const packet = initPacket(data);
  console.log(`↓ ${packet}`);
});

ws.on('error', (err) => {
  console.error('Client error:', err);
});

ws.on('close', (code, reason) => {
  console.log(`Disconnected from server (code: ${code}):`, reason.toString());
  clearInterval(pingInterval);
});
