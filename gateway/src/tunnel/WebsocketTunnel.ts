import { promisify } from 'node:util';
import { WebSocket } from 'ws';

import type { TunnelConnection } from '../nat/TunnelConnection.js';
import { Ipv4OrIpv6Packet } from '../ip/Ipv4OrIpv6Packet.js';

export class WebsocketTunnel implements TunnelConnection {
  public readonly id: string;

  protected readonly wsSendPromisified: (data: Buffer) => Promise<void>;

  constructor(
    protected wsClient: WebSocket,
    remoteIpAddress: string,
    remotePort: number,
  ) {
    this.id = `${remoteIpAddress}-${remotePort}`;
    this.wsClient = wsClient;
    this.wsSendPromisified = promisify(wsClient.send);
  }

  async sendPacket(packet: Ipv4OrIpv6Packet) {
    return this.wsSendPromisified(packet.buffer);
  }

  isAlive() {
    return this.wsClient.readyState === WebSocket.OPEN;
  }
}
