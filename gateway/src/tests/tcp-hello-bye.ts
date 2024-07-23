import { hrtime } from 'node:process';

import { Ipv4Address } from '../protocolDataUnits/ipv4/Ipv4Address.js';
import { Ipv4Packet } from '../protocolDataUnits/ipv4/Ipv4Packet.js';
import { runTest } from './utils/runner.js';
import { TcpFlag, TcpSegment } from '../serviceDataUnits/TcpSegment.js';
import { GatewayClient } from './utils/GatewayClient.js';
import { IpChecksumContext } from '../serviceDataUnits/checksums/IpChecksumContext.js';
import { TransportProtocol } from '../serviceDataUnits/TransportProtocol.js';

const SERVER_PORT = 443;
const CLIENT_PORT = 54321;

const TCP_WINDOW_SIZE = 65535;

async function establishTcpConnection(
  sourceAddress: Ipv4Address,
  destinationAddress: Ipv4Address,
  gatewayClient: GatewayClient,
  checksumContext: IpChecksumContext,
): Promise<number> {
  console.log('Establishing TCP connection...');

  const synSegment = TcpSegment.create(
    CLIENT_PORT,
    SERVER_PORT,
    1000, // Initial sequence number
    0,
    [TcpFlag.SYN],
    TCP_WINDOW_SIZE,
    checksumContext,
  );
  const synPacket = Ipv4Packet.create(
    sourceAddress,
    destinationAddress,
    TransportProtocol.TCP,
    synSegment.buffer,
  );
  await gatewayClient.sendPacket(synPacket);
  console.log(`↑ SYN: ${synPacket}`);

  const synAckPacket = await gatewayClient.readNextPacket();
  console.log(`↓ SYN-ACK: ${synAckPacket}`);

  const synAckSegment = synAckPacket.getServiceData() as TcpSegment;
  const serverSeqNum = synAckSegment.getSequenceNumber();
  const serverAckNum = synAckSegment.getAcknowledgmentNumber();

  const ackSegment = TcpSegment.create(
    CLIENT_PORT,
    SERVER_PORT,
    serverAckNum,
    serverSeqNum + 1,
    [TcpFlag.ACK],
    TCP_WINDOW_SIZE,
    checksumContext,
  );

  const ackPacket = Ipv4Packet.create(
    sourceAddress,
    destinationAddress,
    TransportProtocol.TCP,
    ackSegment.buffer,
  );

  await gatewayClient.sendPacket(ackPacket);
  console.log(`↑ ACK: ${ackPacket}`);

  return serverSeqNum + 1;
}

async function closeTcpConnection(
  sourceAddress: Ipv4Address,
  destinationAddress: Ipv4Address,
  gatewayClient: GatewayClient,
  seqNum: number,
  ackNum: number,
  checksumContext: IpChecksumContext,
): Promise<void> {
  console.log('Closing TCP connection...');

  const finSegment = TcpSegment.create(
    CLIENT_PORT,
    SERVER_PORT,
    seqNum,
    ackNum,
    [TcpFlag.FIN, TcpFlag.ACK],
    TCP_WINDOW_SIZE,
    checksumContext,
  );

  const finPacket = Ipv4Packet.create(
    sourceAddress,
    destinationAddress,
    TransportProtocol.TCP,
    finSegment.buffer,
  );

  await gatewayClient.sendPacket(finPacket);
  console.log(`↑ FIN: ${finPacket}`);

  const finAckPacket = await gatewayClient.readNextPacket();
  console.log(`↓ FIN-ACK: ${finAckPacket}`);

  const finAckSegment = finAckPacket.getServiceData() as TcpSegment;
  const serverSeqNum = finAckSegment.getSequenceNumber();
  const serverAckNum = finAckSegment.getAcknowledgmentNumber();

  const lastAckSegment = TcpSegment.create(
    CLIENT_PORT,
    SERVER_PORT,
    serverAckNum,
    serverSeqNum + 1,
    [TcpFlag.ACK],
    TCP_WINDOW_SIZE,
    checksumContext,
  );

  const lastAckPacket = Ipv4Packet.create(
    sourceAddress,
    destinationAddress,
    TransportProtocol.TCP,
    lastAckSegment.buffer,
  );

  await gatewayClient.sendPacket(lastAckPacket);
  console.log(`↑ Last ACK: ${lastAckPacket}`);
}

await runTest(async (sourceAddress, destinationAddress, gatewayClient) => {
  const startTime = hrtime.bigint();

  const checksumContext: IpChecksumContext = {
    sourceAddress,
    destinationAddress,
  };

  const serverAckNum = await establishTcpConnection(
    sourceAddress,
    destinationAddress,
    gatewayClient,
    checksumContext,
  );

  await closeTcpConnection(
    sourceAddress,
    destinationAddress,
    gatewayClient,
    serverAckNum,
    serverAckNum,
    checksumContext,
  );

  const endTime = hrtime.bigint();
  const elapsedMs = Number(endTime - startTime) / 1_000_000;
  console.log(`Total time: ${elapsedMs.toFixed(2)}ms`);
});
