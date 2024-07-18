import { argv } from 'node:process';
import { map, pipeline, writeToStream } from 'streaming-iterables';
import { createWebSocketStream } from 'ws';

import { Ipv4Address } from '../ip/ipv4/Ipv4Address.js';
import { Ipv4OrIpv6Packet } from '../ip/Ipv4OrIpv6Packet.js';
import { initPacket } from '../ip/packets.js';
import { connectToWsServer } from './utils/ws.js';

const DEFAULT_SOURCE_ADDRESS = '127.0.1.1';
const GATEWAY_URL = 'ws://localhost:8080';

type PacketSource = AsyncIterable<Ipv4OrIpv6Packet>;
type PacketSink = (packets: PacketSource) => Promise<void>;
type Handler = (
  incomingPackets: PacketSource,
  outgoingPacketsSink: PacketSink,
  sourceAddress: Ipv4Address,
  destinationAddress: Ipv4Address,
) => Promise<void>;

export async function connectToGateway(handler: Handler): Promise<void> {
  const destinationAddressStr = argv[2];
  if (!destinationAddressStr) {
    console.error(`Usage: ${argv[0]} <target-ip-address> [source-ip-address]`);
    process.exit(1);
  }

  const sourceAddress = Ipv4Address.fromString(
    argv[3] ?? DEFAULT_SOURCE_ADDRESS,
  );
  const destinationAddress = Ipv4Address.fromString(destinationAddressStr);

  const ws = await connectToWsServer(GATEWAY_URL);
  const wsStream = createWebSocketStream(ws);
  ws.once('close', (code, reason) => {
    wsStream.destroy();
    console.log(`Disconnected from server (code: ${code}):`, reason.toString());
  });
  ws.once('error', (err) => {
    console.error('Client error:', err);
  });

  const source: PacketSource = pipeline(() => wsStream, map(initPacket));
  const sink: PacketSink = (packets) =>
    pipeline(
      () => packets,
      map((packet) => packet.buffer),
      writeToStream(wsStream),
    );
  try {
    await handler(source, sink, sourceAddress, destinationAddress);
  } finally {
    ws.close();
  }
}
