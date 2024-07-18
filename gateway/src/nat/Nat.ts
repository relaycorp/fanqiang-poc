import { Ipv4Address } from '../ip/ipv4/Ipv4Address.js';
import { ServiceDataUnit } from '../serviceDataUnits/ServiceDataUnit.js';
import { ForwardingSide } from './ForwardingSide.js';
import { Ipv6Address } from '../ip/ipv6/Ipv6Address.js';
import { Ipv4Packet } from '../ip/ipv4/Ipv4Packet.js';
import type { TunnelConnection } from './TunnelConnection.js';
import { Result } from '../utils/result.js';
import { Ipv4OrIpv6Packet } from '../ip/Ipv4OrIpv6Packet.js';
import { ConnectionTracker } from './ConnectionTracker.js';

export type PacketForwardResult = Result<Ipv4OrIpv6Packet, Error>;

/**
 * A network address and port translation (NAPT) or one-to-many NAT.
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

  public forwardPacketsFromTunnel(
    tunnelConnection: TunnelConnection,
  ): (
    packets: AsyncIterable<Ipv4OrIpv6Packet>,
  ) => AsyncIterable<PacketForwardResult> {
    const nat = this;
    return async function* (
      packets: AsyncIterable<Ipv4OrIpv6Packet>,
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

        nat.translatePacketFromPrivateToPublic(packet);
        yield { didSucceed: true, result: packet } as PacketForwardResult;
      }
    };
  }

  public translatePacketFromPrivateToPublic(packet: Ipv4OrIpv6Packet): void {
    const serviceData = packet.getServiceData();
    if (serviceData instanceof ServiceDataUnit) {
      throw new Error('SDUs not implemented.');
    }
    const sourceAddress =
      packet instanceof Ipv4Packet ? this.ipv4Address : this.ipv6Address;
    packet.prepareForForwarding(ForwardingSide.SOURCE, sourceAddress);
  }
}
