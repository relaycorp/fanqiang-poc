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
  let subnetCidr;
  try {
    subnetCidr = new Cidr(subnet);
  } catch (err) {
    throw new Error(`Invalid subnet: ${subnet}`, { cause: err });
  }

  // If it's an IPv6 subnet, skip the first address as that appears to be used for NDP.
  // If it's an IPv4 subnet, skip the network (0) and gateway (1) addresses.
  const offset = subnet.includes(':') ? 1 : 2;

  const start = subnetCidr.toArray({ from: offset, limit: 1 })[0];
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
