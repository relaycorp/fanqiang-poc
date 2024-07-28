import { Ipv4Address } from '../ip/ipv4/Ipv4Address.js';
import { Ipv4Packet } from '../ip/ipv4/Ipv4Packet.js';
import { TunInterface } from '../tun/TunInterface.js';

export abstract class TunnelConnection {
  protected privateToPublicIpMap: Map<string, Ipv4Address> = new Map();
  protected publicToInternalIpMap: Map<string, Ipv4Address> = new Map();

  protected constructor(
    public readonly id: string,
    protected tunInterface: TunInterface,
  ) {}

  abstract sendPacket(packet: Ipv4Packet): Promise<void>;

  abstract isAlive(): boolean;

  protected getOrCreateSourceNatMapping(
    clientAddress: Ipv4Address,
  ): Ipv4Address {
    const clientAddressStr = clientAddress.toString();
    let tunAddress = this.privateToPublicIpMap.get(clientAddressStr);
    if (tunAddress === undefined) {
      tunAddress = this.tunInterface.allocateAddress();
      this.privateToPublicIpMap.set(clientAddressStr, tunAddress.clone());
      this.publicToInternalIpMap.set(
        tunAddress.toString(),
        clientAddress.clone(),
      );
    }
    return this.privateToPublicIpMap.get(clientAddressStr)!;
  }

  // TODO: Not convinced this is the right class for this method
  public routePacketToInternet(packet: Ipv4Packet): void {
    const sourceAddress = packet.getSourceAddress();
    const natAddress = this.getOrCreateSourceNatMapping(sourceAddress);
    packet.setSourceAddress(natAddress);
    packet.recalculateChecksum();
  }

  // TODO: Not convinced this is the right class for this method
  public routePacketFromInternet(packet: Ipv4Packet): boolean {
    const destinationAddress = packet.getDestinationAddress();
    const originalSource = this.publicToInternalIpMap.get(
      destinationAddress.toString(),
    );
    if (originalSource) {
      packet.setDestinationAddress(originalSource);
      packet.recalculateChecksum();
    }

    return !!originalSource;
  }
}
