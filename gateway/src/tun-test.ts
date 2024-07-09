import { TunInterface } from './TunInterface.js';

(async () => {
  const tunInterface = await TunInterface.open();
  console.log('Opened TUN device');

  const abortController = new AbortController();
  abortController.signal.addEventListener('abort', async () => {
    console.log('Aborting packet processing');
    await tunInterface.close();
  });

  process.on('exit', () => {
    abortController.abort();
  });

  for await (const packet of tunInterface.streamPackets(abortController.signal)) {
    console.log(`Read ${packet.length} bytes from device tun0`);
  }
})();
