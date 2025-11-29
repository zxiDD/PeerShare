const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(express.json());

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });
const peers = new Map();
wss.on('connection', ws => {
  let myId = null;
  ws.on('message', raw => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (error) {
      return;
    }

    if (msg.type === 'register' && msg.id) {
      myId = msg.id;
      peers.set(myId, ws);
      console.log('registers', myId);
      return;
    }

    if (
      msg.type === 'offer' ||
      msg.type === 'answer' ||
      msg.type === 'candidate'
    ) {
      const target = peers.get(msg.to);
      if (target && target.readyState === WebSocket.OPEN) {
        target.send(JSON.stringify(msg));
      } else {
        ws.send(JSON.stringify({ type: 'peer-offline', to: msg.to }));
      }
      return;
    }
  });
  ws.on('close', () => {
    if (myId) {
      peers.delete(myId);
      console.log('disconnected', myId);
    }
  });
});

const PORT = process.env.PORT || 9000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
