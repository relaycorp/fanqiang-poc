import { WebSocket } from 'ws';

import { Ipv4Or6Packet } from '../../protocolDataUnits/Ipv4Or6Packet.js';
import { initPacket } from '../../protocolDataUnits/packets.js';

const GATEWAY_URL = 'ws://localhost:8080';

async function connectToWsServer(url: string): Promise<WebSocket> {
  return new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(url);

    function handleConnection() {
      ws.removeListener('error', handleError);
      resolve(ws);
    }

    ws.once('open', handleConnection);

    function handleError(cause: Error) {
      ws.removeListener('open', handleConnection);
      reject(new Error('Failed to connect to WS server', { cause }));
    }

    ws.once('error', handleError);
  });
}

export class GatewayClient {
  protected constructor(protected readonly ws: WebSocket) {}

  public static async connect(): Promise<GatewayClient> {
    const ws = await connectToWsServer(GATEWAY_URL);
    return new GatewayClient(ws);
  }

  protected async isConnectionOpen(): Promise<boolean> {
    return this.ws.readyState === WebSocket.OPEN;
  }

  public async readNextPacket(): Promise<Ipv4Or6Packet> {
    return new Promise((resolve, reject) => {
      if (!this.isConnectionOpen()) {
        reject(new Error('Connection is not open'));
        return;
      }

      this.ws.once('message', (data) => {
        resolve(initPacket(data as Buffer));
      });
    });
  }

  public async sendPacket(packet: Ipv4Or6Packet): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnectionOpen()) {
        reject(new Error('Connection is not open'));
        return;
      }

      this.ws.send(packet.buffer, (cause) => {
        if (cause) {
          reject(new Error('Failed to send packet', { cause }));
        } else {
          resolve();
        }
      });
    });
  }
}
