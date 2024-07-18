import { Ipv4OrIpv6Packet } from '../ip/Ipv4OrIpv6Packet.js';

export interface TunnelConnection {
  id: string;

  sendPacket(packet: Ipv4OrIpv6Packet): Promise<void>;

  isAlive(): boolean;
}
