import { argv } from 'node:process';
import Cidr from 'ip-cidr';
import type { Logger } from 'pino';

import { Ipv4Address } from '../../ip/ipv4/Ipv4Address.js';
import { GatewayClient } from './GatewayClient.js';
import { createLogger } from '../../utils/logging.js';

type TestHandler = (
  sourceAddress: Ipv4Address,
  destinationAddress: Ipv4Address,
  gatewayClient: GatewayClient,
  logger: Logger,
) => Promise<void>;

function pickAddress(subnet: string): Ipv4Address {
  const subnetCidr = new Cidr(subnet);
  const start = subnetCidr.toArray({ from: 2, limit: 1 })[0];
  return Ipv4Address.fromString(start);
}

export async function runTest(handler: TestHandler): Promise<void> {
  const logger = createLogger();

  const destinationAddressStr = argv[2];
  if (!destinationAddressStr) {
    logger.error(`Usage: ${argv[0]} target-ip-address [source-ip-address]`);
    process.exit(1);
  }
  const destinationAddress = Ipv4Address.fromString(destinationAddressStr);

  const gatewayClient = await GatewayClient.connect(logger);

  const subnetMessage = await gatewayClient.readNextMessage();
  const subnet = subnetMessage.toString();
  const sourceAddress = pickAddress(subnet);
  logger.info({ subnet, ipAddress: sourceAddress }, 'Source address selected');

  await handler(sourceAddress, destinationAddress, gatewayClient, logger);
}
