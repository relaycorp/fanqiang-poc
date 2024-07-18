import { TunnelConnection } from './TunnelConnection.js';
import { BaseIpAddress } from '../ip/BaseIpAddress.js';

/**
 * Represents a connection between two endpoints.
 */
interface Connection<Endpoint> {
  /**
   * The endpoint behind the tunnel.
   */
  readonly privateEndpoint: Endpoint;

  /**
   * The Internet host that the private endpoint is communicating with.
   */
  readonly publicEndpoint: Endpoint;

  readonly transportProtocol: number;

  readonly lastUseTimestampNs: bigint;

  readonly tunnelConnection: TunnelConnection;
}

/**
 * A connection whose Transport Layer protocol is not supported by the NAT.
 */
export type L3Connection<Address extends BaseIpAddress<any>> =
  Connection<Address>;

interface Endpoint<Address extends BaseIpAddress<any>> {
  address: Address;
  port: number;
}

/**
 * A connection whose Transport Layer protocol is supported by the NAT.
 */
export type L4Connection<Address extends BaseIpAddress<any>> = Connection<
  Endpoint<Address>
>;
