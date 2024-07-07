import { WebSocketServer, WebSocket } from 'ws';
import rawSocket, { AddressFamily, Protocol, SocketOptions } from 'raw-socket';

const server = new WebSocketServer({ host: '127.0.0.1', port: 8080 });

// TODO: What other options should we consider?
const rawSocketOptions: SocketOptions = {
  addressFamily: AddressFamily.IPv4,
  protocol: Protocol.ICMP,
};

server.on('connection', (wsClient: WebSocket) => {
  console.log('Client connected');

  // TODO: Should we create a pool of raw sockets and reuse them across client connections?
  const socket = rawSocket.createSocket(rawSocketOptions);

  wsClient.on('message', (data: Buffer) => {
    console.log(`Received ${data.length} bytes from WS client`);

    // TODO: Check that it's indeed an IPv4 address and switch to IPv6 if needed
    const destinationAddress = data.subarray(0, 4).join('.');

    socket.send(data, 0, data.length, destinationAddress, (err, bytes) => {
      if (err) {
        console.error(`Error sending data to ${destinationAddress}:`, err);
      } else {
        console.log(`Sent ${bytes} bytes to ${destinationAddress}`);
      }
    });
  });

  socket.on('message', (buffer: Buffer, sourceAddress: string) => {
    console.log(`Received ${buffer.length} bytes from ${sourceAddress}`);
    wsClient.send(buffer);
  });

  wsClient.on('error', (err) => {
    console.error('Client error:', err);
    socket.close();
  });

  wsClient.on('close', () => {
    console.log('Client disconnected');
    socket.close();
  });

  socket.on('error', (err) => {
    console.error('Raw socket error:', err);

    // TODO: Close with an error code
    wsClient.close();
  });

  socket.on('close', () => {
    console.log('Raw socket closed');
  });
});

console.log('Server started on port 8080');
