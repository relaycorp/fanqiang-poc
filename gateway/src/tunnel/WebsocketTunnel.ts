import { WebSocket } from 'ws';

import { TunnelConnection } from '../nat/TunnelConnection.js';
import type { TunInterface } from '../tun/TunInterface.js';
import { Ipv4Or6Packet } from '../protocolDataUnits/Ipv4Or6Packet.js';

export class WebsocketTunnel extends TunnelConnection {
  constructor(
    protected wsClient: WebSocket,
    remoteIpAddress: string,
    remotePort: number,
    tunInterface: TunInterface,
  ) {
    super(`${remoteIpAddress}-${remotePort}`, tunInterface);
  }

  override async sendPacket(packet: Ipv4Or6Packet) {
    return new Promise<void>((resolve, reject) => {
      this.wsClient.send(packet.buffer, (err) => {
        if (err) {
          reject(
            new Error(`Failed to send packet to ${this.id}`, { cause: err }),
          );
        } else {
          resolve();
        }
      });
    });
  }

  override isAlive() {
    return this.wsClient.readyState === WebSocket.OPEN;
  }
}
