import { hrtime } from 'node:process';

import { Ipv4Or6Packet } from '../protocolDataUnits/Ipv4Or6Packet.js';
import { Ipv4Address } from '../protocolDataUnits/ipv4/Ipv4Address.js';
import { Connection, PrivateEndpoint } from './connection.js';
import { Ipv6Address } from '../protocolDataUnits/ipv6/Ipv6Address.js';
import { TunnelConnection } from './TunnelConnection.js';
import { IpAddress } from '../protocolDataUnits/IpAddress.js';
import { Ipv4Or6Address } from '../protocolDataUnits/Ipv4Or6Address.js';

/**
 * Maximum number of connections that can be tracked.
 */
const MAX_CONNECTIONS = 2 ** 18; // 262,144; the default in Netfilter

export class ConnectionTracker {
  protected connectionCount = 0;

  // TODO: Use a data structure that allows for efficient lookups (e.g. trie)
  protected l3Ipv4Connections: Connection<Ipv4Address>[] = [];
  protected l3Ipv6Connections: Connection<Ipv6Address>[] = [];

  // TODO: As a full cone NAT, we should track the private endpoint instead.
  protected getL3Connection<Address extends IpAddress<any>>(
    publicEndpointAddress: Address,
    transportProtocol: number,
  ): Connection<Address> | null {
    const connections = (
      publicEndpointAddress instanceof Ipv4Address
        ? this.l3Ipv4Connections
        : this.l3Ipv6Connections
    ) as Connection<Address>[];
    const connection = connections.find(
      (connection) =>
        connection.publicEndpointAddress.equals(publicEndpointAddress) &&
        connection.transportProtocol === transportProtocol,
    );
    return connection ?? null;
  }

  private createL3Connection(
    sourceAddress: Ipv6Address | Ipv4Address,
    destinationAddress: Ipv6Address | Ipv4Address,
    transportProtocol: number,
    tunnelConnection: TunnelConnection,
  ) {
    if (MAX_CONNECTIONS <= this.connectionCount) {
      throw new Error('Too many connections open');
    }
    const connection: Connection<typeof sourceAddress> = {
      privateEndpoint: {
        address: sourceAddress.clone(),
        tunnelConnection,
      },
      publicEndpointAddress: destinationAddress.clone(),
      transportProtocol,
      lastUseTimestampNs: hrtime.bigint(),
    };
    const connectionPool =
      sourceAddress instanceof Ipv4Address
        ? this.l3Ipv4Connections
        : this.l3Ipv6Connections;
    connectionPool.push(connection);

    this.connectionCount += 1;
  }

  public trackL3Connection(
    internetBoundPacket: Ipv4Or6Packet,
    tunnelConnection: TunnelConnection,
  ): void {
    const sourceAddress = internetBoundPacket.getSourceAddress();
    const destinationAddress = internetBoundPacket.getDestinationAddress();
    const transportProtocol = internetBoundPacket.getTransportProtocol();

    const connection = this.getL3Connection(
      destinationAddress,
      transportProtocol,
    );

    if (connection === null) {
      // There's no existing connection for that destination/protocol combo
      this.createL3Connection(
        sourceAddress,
        destinationAddress,
        transportProtocol,
        tunnelConnection,
      );
    } else if (
      connection.privateEndpoint.tunnelConnection === tunnelConnection
    ) {
      if (connection.privateEndpoint.address.equals(sourceAddress)) {
        connection.lastUseTimestampNs = hrtime.bigint();
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

  public getL3PrivateEndpoint(
    publicEndpointAddress: Ipv4Or6Address,
    transportProtocol: number,
  ): PrivateEndpoint<typeof publicEndpointAddress> | null {
    const connection = this.getL3Connection(
      publicEndpointAddress,
      transportProtocol,
    );
    if (connection === null) {
      return null;
    }
    connection.lastUseTimestampNs = hrtime.bigint();
    return connection.privateEndpoint;
  }
}
