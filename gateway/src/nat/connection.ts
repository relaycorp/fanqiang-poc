import { TunnelConnection } from './TunnelConnection.js';
import { IpAddress } from '../protocolDataUnits/IpAddress.js';

export interface PrivateEndpoint<Address extends IpAddress<any>> {
  readonly address: Address;
  readonly tunnelConnection: TunnelConnection;
}

/**
 * Represents a connection between two endpoints.
 */
export interface Connection<Address extends IpAddress<any>> {
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
export interface L4Connection<Address extends IpAddress<any>>
  extends Connection<Address> {
  readonly privateEndpointPort: number;
  readonly publicEndpointPort: number;
  readonly natPort: number;
}
