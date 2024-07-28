import { argv } from 'node:process';
import Cidr from 'ip-cidr';

import { Ipv4Address } from '../../ip/ipv4/Ipv4Address.js';
import { GatewayClient } from './GatewayClient.js';

type TestHandler = (
  sourceAddress: Ipv4Address,
  destinationAddress: Ipv4Address,
  gatewayClient: GatewayClient,
) => Promise<void>;

function pickAddress(subnet: string): Ipv4Address {
  const subnetCidr = new Cidr(subnet);
  const start = subnetCidr.toArray({ from: 2, limit: 1 })[0];
  return Ipv4Address.fromString(start);
}

export async function runTest(handler: TestHandler): Promise<void> {
  const destinationAddressStr = argv[2];
  if (!destinationAddressStr) {
    console.error(`Usage: ${argv[0]} target-ip-address [source-ip-address]`);
    process.exit(1);
  }
  const destinationAddress = Ipv4Address.fromString(destinationAddressStr);

  const gatewayClient = await GatewayClient.connect();

  const subnetMessage = await gatewayClient.readNextMessage();
  const subnet = subnetMessage.toString();
  console.log('Got subnet:', subnet);
  const sourceAddress = pickAddress(subnet);

  await handler(sourceAddress, destinationAddress, gatewayClient);
}
