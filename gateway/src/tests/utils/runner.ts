import { argv } from 'node:process';

import { Ipv4Address } from '../../ip/ipv4/Ipv4Address.js';
import { GatewayClient } from './GatewayClient.js';

const DEFAULT_SOURCE_ADDRESS_PREFIX = '127.0.1.';

type TestHandler = (
  sourceAddress: Ipv4Address,
  destinationAddress: Ipv4Address,
  gatewayClient: GatewayClient,
) => Promise<void>;

function generateSourceAddress(): string {
  // Generate a random octet between 2 and 254
  const randomOctet = Math.floor(Math.random() * 253 + 2);
  return `${DEFAULT_SOURCE_ADDRESS_PREFIX}${randomOctet}`;
}

export async function runTest(handler: TestHandler): Promise<void> {
  const destinationAddressStr = argv[2];
  if (!destinationAddressStr) {
    console.error(`Usage: ${argv[0]} target-ip-address [source-ip-address]`);
    process.exit(1);
  }
  const destinationAddress = Ipv4Address.fromString(destinationAddressStr);

  const sourceAddressStr = argv[3] ?? generateSourceAddress();
  const sourceAddress = Ipv4Address.fromString(sourceAddressStr);

  await handler(
    sourceAddress,
    destinationAddress,
    await GatewayClient.connect(),
  );
}
