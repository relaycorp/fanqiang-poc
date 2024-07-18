import { Ipv4Or6Packet } from '../protocolDataUnits/Ipv4Or6Packet.js';

export interface TunnelConnection {
  id: string;

  sendPacket(packet: Ipv4Or6Packet): Promise<void>;

  isAlive(): boolean;
}
