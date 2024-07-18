import { WebSocket } from 'ws';

import type { TunnelConnection } from '../nat/TunnelConnection.js';
import { Ipv4OrIpv6Packet } from '../ip/Ipv4OrIpv6Packet.js';

export class WebsocketTunnel implements TunnelConnection {
  public readonly id: string;

  constructor(
    protected wsClient: WebSocket,
    remoteIpAddress: string,
    remotePort: number,
  ) {
    this.id = `${remoteIpAddress}-${remotePort}`;
    this.wsClient = wsClient;
  }

  async sendPacket(packet: Ipv4OrIpv6Packet) {
    return new Promise<void>((resolve, reject) => {
      this.wsClient.send(packet.buffer, (err) => {
        if (err) {
          reject(new Error(`Failed to send packet to ${this.id}`, err));
        } else {
          resolve();
        }
      });
    });
  }

  isAlive() {
    return this.wsClient.readyState === WebSocket.OPEN;
  }
}
