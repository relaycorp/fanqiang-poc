import WebSocket from 'ws';
import raw from 'raw-socket';

const GATEWAY_URL = 'ws://localhost:8080';
const TARGET_ADDRESS = '1.1.1.1';

// ICMP echo (ping)
const ICMP_PACKET = Buffer.from([
  0x08, 0x00, 0x00, 0x00, 0x00, 0x01, 0x0a, 0x09, 0x61, 0x62, 0x63, 0x64, 0x65,
  0x66, 0x67, 0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x70, 0x71, 0x72,
  0x73, 0x74, 0x75, 0x76, 0x77, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68,
  0x69,
]);
raw.writeChecksum(ICMP_PACKET, 2, raw.createChecksum(ICMP_PACKET));

const ws = new WebSocket(GATEWAY_URL);

let pingInterval: NodeJS.Timeout; // Store the interval timer

ws.on('open', () => {
  console.log('Connected to server');

  // Send pings every second
  pingInterval = setInterval(() => {
    const ipBuffer = Buffer.from(TARGET_ADDRESS.split('.').map(Number));
    const finalBuffer = Buffer.concat([ipBuffer, ICMP_PACKET]);

    ws.send(finalBuffer);
    console.log(`Sent ping to ${TARGET_ADDRESS}`);
  }, 1000);
});

ws.on('message', (data: Buffer) => {
  console.log(`Received ${data.length} bytes from server`);
});

ws.on('error', (err) => {
  console.error('Client error:', err);
});

ws.on('close', () => {
  console.log('Disconnected from server');
  clearInterval(pingInterval);
});
