import { hrtime } from 'node:process';

import { Ipv4OrIpv6Packet } from '../ip/Ipv4OrIpv6Packet.js';
import { Ipv4Address } from '../ip/ipv4/Ipv4Address.js';
import { L3Connection } from './connection.js';
import { Ipv6Address } from '../ip/ipv6/Ipv6Address.js';
import { TunnelConnection } from './TunnelConnection.js';
import { BaseIpAddress } from '../ip/BaseIpAddress.js';

/**
 * Maximum number of connections that can be tracked.
 */
const MAX_CONNECTIONS = 2 ** 18; // 262,144; the default in Netfilter

// TODO: Adopt the NetFilter timeouts: `sysctl -a 2>/dev/null | grep -E 'nf_conntrack_.+timeout'`
export class ConnectionTracker {
  protected connectionCount = 0;

  // TODO: Use a data structure that allows for efficient lookups (e.g. trie)
  protected l3Ipv4Connections: L3Connection<Ipv4Address>[] = [];
  protected l3Ipv6Connections: L3Connection<Ipv6Address>[] = [];

  protected getL3Connection<Address extends BaseIpAddress<any>>(
    publicEndpointAddress: Address,
    transportProtocol: number,
  ): L3Connection<Address> | null {
    const connections = (
      publicEndpointAddress instanceof Ipv4Address
        ? this.l3Ipv4Connections
        : this.l3Ipv6Connections
    ) as L3Connection<Address>[];
    const matchingConnections = connections.find(
      (connection) =>
        connection.publicEndpoint.equals(publicEndpointAddress) &&
        connection.transportProtocol === transportProtocol,
    );
    return matchingConnections ?? null;
  }

  public trackL3Connection(
    internetBoundPacket: Ipv4OrIpv6Packet,
    tunnelConnection: TunnelConnection,
  ): void {
    const sourceAddress = internetBoundPacket.getSourceAddress();
    const destinationAddress = internetBoundPacket.getDestinationAddress();
    const transportProtocol = internetBoundPacket.getTransportProtocol();

    const existingConnection = this.getL3Connection(
      destinationAddress,
      transportProtocol,
    );

    if (existingConnection === null) {
      // There's no existing connection for that destination/protocol combo,
      // so it's safe to create a new one.

      if (MAX_CONNECTIONS <= this.connectionCount) {
        throw new Error('Too many connections open');
      }

      const connection: L3Connection<typeof sourceAddress> = {
        privateEndpoint: sourceAddress.clone(),
        publicEndpoint: destinationAddress.clone(),
        transportProtocol,
        tunnelConnection,
        lastUseTimestampNs: hrtime.bigint(),
      };
      const connectionPool =
        sourceAddress instanceof Ipv4Address
          ? this.l3Ipv4Connections
          : this.l3Ipv6Connections;
      connectionPool.push(connection);

      this.connectionCount += 1;
    } else if (existingConnection.tunnelConnection === tunnelConnection) {
      if (existingConnection.privateEndpoint.equals(sourceAddress)) {
        existingConnection.lastUseTimestampNs = hrtime.bigint();
      } else {
        throw new Error(
          'Connection exists for different private address in same tunnel',
        );
      }
    } else {
      // TODO: Handle the case where the VPN client is reconnecting
      // (it'd be a different tunnel connection)
      throw new Error(
        'Another tunnel connection already exists for this destination/protocol combo',
      );
    }
  }
}
