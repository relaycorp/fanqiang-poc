import { argv } from 'node:process';
import Cidr from 'ip-cidr';
import type { Logger } from 'pino';

import { Ipv4Address } from '../../ip/ipv4/Ipv4Address.js';
import { GatewayClient } from './GatewayClient.js';
import { createLogger } from '../../utils/logging.js';
import { initAddress, type Ipv4Or6Address } from '../../ip/ipv4Or6.js';

type TestHandler = (
  sourceAddress: Ipv4Or6Address,
  destinationAddress: Ipv4Or6Address,
  gatewayClient: GatewayClient,
  logger: Logger,
) => Promise<void>;

function pickAddress(subnet: string): Ipv4Or6Address {
  const subnetCidr = new Cidr(subnet);
  const start = subnetCidr.toArray({ from: 2, limit: 1 })[0];
  return initAddress(start);
}

export async function runTest(handler: TestHandler): Promise<void> {
  const logger = createLogger();

  const destinationAddressStr = argv[2];
  if (!destinationAddressStr) {
    logger.error(`Usage: ${argv[1]} destination-ip-address`);
    process.exit(1);
  }
  const destinationAddress = initAddress(destinationAddressStr);

  const gatewayClient = await GatewayClient.connect(logger);

  const subnetMessage = await gatewayClient.readNextMessage();
  const [ipv4Subnet, ipv6Subnet] = subnetMessage.toString().split(',');
  const subnet =
    destinationAddress instanceof Ipv4Address ? ipv4Subnet : ipv6Subnet;
  const sourceAddress = pickAddress(subnet);
  logger.info({ subnet, ipAddress: sourceAddress }, 'Source address selected');

  await handler(sourceAddress, destinationAddress, gatewayClient, logger);
}
