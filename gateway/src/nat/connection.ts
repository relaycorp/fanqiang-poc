import { TunnelConnection } from './TunnelConnection.js';
import { BaseIpAddress } from '../ip/BaseIpAddress.js';

export interface PrivateEndpoint<Address extends BaseIpAddress<any>> {
  readonly address: Address;
  readonly tunnelConnection: TunnelConnection;
}

/**
 * Represents a connection between two endpoints.
 */
export interface Connection<Address extends BaseIpAddress<any>> {
  /**
   * The endpoint behind the tunnel.
   */
  readonly privateEndpoint: PrivateEndpoint<Address>;

  /**
   * The Internet host that the private endpoint is communicating with.
   */
  readonly publicEndpointAddress: Address;

  readonly transportProtocol: number;

  lastUseTimestampNs: bigint;
}

/**
 * A connection whose Transport Layer protocol is supported by the NAT.
 */
export interface L4Connection<Address extends BaseIpAddress<any>>
  extends Connection<Address> {
  readonly privateEndpointPort: number;
  readonly publicEndpointPort: number;
  readonly natPort: number;
}
