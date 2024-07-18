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

export class ConnectionTracker {
  protected connectionCount = 0;

  // TODO: Use a data structure that allows for efficient lookups (e.g. trie)
  protected l3Ipv4Connections: L3Connection<Ipv4Address>[] = [];
  protected l3Ipv6Connections: L3Connection<Ipv6Address>[] = [];

  protected getL3TunnelConnections<Address extends BaseIpAddress<any>>(
    privateAddress: Address,
    publicAddress: Address,
    transportProtocol: number,
  ): readonly TunnelConnection[] {
    const connections =
      privateAddress instanceof Ipv4Address
        ? this.l3Ipv4Connections
        : this.l3Ipv6Connections;
    const matchingConnections = connections.filter(
      (connection) =>
        connection.privateEndpoint.equals(privateAddress) &&
        connection.publicEndpoint.equals(publicAddress) &&
        connection.transportProtocol === transportProtocol,
    );
    return matchingConnections.map((connection) => connection.tunnelConnection);
  }

  public trackL3Connection(
    internetBoundPacket: Ipv4OrIpv6Packet,
    tunnelConnection: TunnelConnection,
  ): void {
    if (MAX_CONNECTIONS <= this.connectionCount) {
      throw new Error('Too many connections open');
    }

    const sourceAddress = internetBoundPacket.getSourceAddress();
    const destinationAddress = internetBoundPacket.getDestinationAddress();
    const transportProtocol = internetBoundPacket.getTransportProtocol();

    const existingConnections = this.getL3TunnelConnections(
      sourceAddress,
      destinationAddress,
      transportProtocol,
    );

    if (existingConnections.length === 0) {
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
    }

    const anyConnectionForDifferentTunnel = existingConnections.some(
      (existingConnection) => existingConnection !== tunnelConnection,
    );
    if (anyConnectionForDifferentTunnel) {
      // TODO: Handle the case where a VPN client is reconnecting
      throw new Error(
        'Another tunnel connection already exists for this connection',
      );
    }
  }
}
