import { WebSocket } from 'ws';
import { Logger } from 'pino';

import { initPacket, Ipv4Or6Packet } from '../../ip/ipv4Or6.js';
import { padMessage, unpadMessage } from '../../tunnel/obfuscation/messages.js';
import { sendNoiseWhilstOpen } from '../../tunnel/obfuscation/connection.js';

const DEFAULT_GATEWAY_URL = 'ws://localhost:8080';
const GATEWAY_URL = process.env.GATEWAY_URL || DEFAULT_GATEWAY_URL;

async function connectToWsServer(
  url: string,
  logger: Logger,
): Promise<WebSocket> {
  return new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(url);

    function handleConnection() {
      ws.removeListener('error', handleError);
      sendNoiseWhilstOpen(ws, logger);
      resolve(ws);
    }

    ws.once('open', handleConnection);

    function handleError(cause: Error) {
      ws.removeListener('open', handleConnection);
      reject(new Error('Failed to connect to WS server', { cause }));
    }

    ws.once('error', handleError);

    ws.once('close', (code, reason) => {
      logger.info(`Connection closed: ${code} ${reason.toString()}`);
    });
  });
}

export class GatewayClient {
  protected constructor(protected readonly ws: WebSocket) {}

  public static async connect(logger: Logger): Promise<GatewayClient> {
    const ws = await connectToWsServer(GATEWAY_URL, logger);
    return new GatewayClient(ws);
  }

  protected isConnectionOpen(): boolean {
    return this.ws.readyState === WebSocket.OPEN;
  }

  public async readNextMessage(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      if (!this.isConnectionOpen()) {
        reject(new Error('Connection is not open'));
        return;
      }

      this.ws.once('message', (data, isBinary) => {
        if (!isBinary) {
          return reject(new Error('Received text frame'));
        }

        const dataBuffer = data as Buffer;
        if (dataBuffer.byteLength === 0 || dataBuffer[0] === 0) {
          // Message is either empty or noise, so skip it
          this.readNextMessage().then(resolve, reject);
        } else {
          const messageUnpadded = unpadMessage(dataBuffer);
          resolve(messageUnpadded);
        }
      });
    });
  }

  public async readNextPacket(): Promise<Ipv4Or6Packet> {
    const nextMessage = await this.readNextMessage();
    return initPacket(nextMessage as Buffer);
  }

  public async sendPacket(packet: Ipv4Or6Packet): Promise<void> {
    if (!this.isConnectionOpen()) {
      throw new Error('Connection is not open');
    }

    return new Promise((resolve, reject) => {
      const packetPadded = padMessage(packet.buffer);
      this.ws.send(packetPadded, (cause) => {
        if (cause && this.isConnectionOpen()) {
          reject(new Error('Failed to send packet', { cause }));
        } else {
          resolve();
        }
      });
    });
  }
}
