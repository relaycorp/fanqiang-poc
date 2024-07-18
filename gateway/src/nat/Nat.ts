import { Ipv4Address } from '../protocolDataUnits/ipv4/Ipv4Address.js';
import { ServiceDataUnit } from '../serviceDataUnits/ServiceDataUnit.js';
import { ForwardingSide } from './ForwardingSide.js';
import { Ipv6Address } from '../protocolDataUnits/ipv6/Ipv6Address.js';
import { Ipv4Packet } from '../protocolDataUnits/ipv4/Ipv4Packet.js';
import type { TunnelConnection } from './TunnelConnection.js';
import { Result } from '../utils/result.js';
import { Ipv4Or6Packet } from '../protocolDataUnits/Ipv4Or6Packet.js';
import { ConnectionTracker } from './ConnectionTracker.js';

export type PacketForwardResult = Result<Ipv4Or6Packet, Error>;

type PacketProcessor = (
  packets: AsyncIterable<Ipv4Or6Packet>,
) => AsyncIterable<PacketForwardResult>;

/**
 * A ip address and port translation (NAPT) or one-to-many NAT.
 *
 * Translation method: Port-restricted cone for compatibility with P2P apps,
 * although it's less secure than symmetric.
 */
export class Nat {
  readonly tracker = new ConnectionTracker();

  constructor(
    protected ipv4Address: Ipv4Address,
    protected ipv6Address: Ipv6Address,
  ) {}

  protected translatePacketFromTunnel(packet: Ipv4Or6Packet): void {
    const serviceData = packet.getServiceData();
    if (serviceData instanceof ServiceDataUnit) {
      throw new Error('SDUs not implemented.');
    }
    const sourceAddress =
      packet instanceof Ipv4Packet ? this.ipv4Address : this.ipv6Address;
    packet.prepareForForwarding(ForwardingSide.SOURCE, sourceAddress);
  }

  public forwardPacketsFromTunnel(
    tunnelConnection: TunnelConnection,
  ): PacketProcessor {
    const nat = this;
    return async function* (
      packets: AsyncIterable<Ipv4Or6Packet>,
    ): AsyncIterable<PacketForwardResult> {
      for await (const packet of packets) {
        const destinationAddress = packet.getDestinationAddress();
        if (destinationAddress.isPrivate()) {
          yield {
            didSucceed: false,
            context: new Error(
              `Packet destination (${destinationAddress}) is private`,
            ),
          };
        }

        try {
          nat.tracker.trackL3Connection(packet, tunnelConnection);
        } catch (err: any) {
          yield {
            didSucceed: false,
            context: new Error('Failed to track L3 connection', { cause: err }),
          };
          continue;
        }

        nat.translatePacketFromTunnel(packet);
        yield { didSucceed: true, result: packet } as PacketForwardResult;
      }
    };
  }

  public forwardPacketsFromInternet(): (
    packets: AsyncIterable<Ipv4Or6Packet>,
  ) => Promise<void> {
    const nat = this;
    return async function (
      packets: AsyncIterable<Ipv4Or6Packet>,
    ): Promise<void> {
      for await (const packet of packets) {
        const sourceAddress = packet.getSourceAddress();
        const protocol = packet.getTransportProtocol();
        const endpoint = nat.tracker.getL3PrivateEndpoint(
          sourceAddress,
          protocol,
        );
        if (endpoint === null) {
          console.error(
            `No connection found for ${sourceAddress} with protocol ${protocol}`,
          );
          continue;
        }

        const { tunnelConnection } = endpoint;
        if (tunnelConnection.isAlive()) {
          packet.prepareForForwarding(
            ForwardingSide.DESTINATION,
            endpoint.address,
          );
          tunnelConnection
            .sendPacket(packet)
            .catch((err) =>
              console.error('Failed to send packet to client:', err),
            );
        } else {
          console.error(
            `Skipping packet for dead tunnel connection ${tunnelConnection.id}`,
          );
        }
      }
    };
  }
}
