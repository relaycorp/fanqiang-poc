import { WebSocketServer } from 'ws';

const server = new WebSocketServer({ port: 8080 });

server.on('connection', (connection) => {
  connection.on('error', console.error);

  connection.on('message', function message(data) {
    console.log('Received: %s', data);
  });

  connection.send('Foo');
});
