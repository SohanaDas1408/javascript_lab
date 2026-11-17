const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const os = require('os');
const path = require('path');
const { getLocalIP } = require('./lib/utils');
const TCPManager = require('./lib/tcp-manager');
const Discovery = require('./lib/discovery');

const TCP_PORT = 4000;
const HTTP_PORT = 3000;
const DISCOVERY_PORT = 41234;

const localIP = getLocalIP();
const hostname = os.hostname();

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const tcpManager = new TCPManager({ port: TCP_PORT, localIP, hostname });
tcpManager.startServer();

const discovery = new Discovery({ port: DISCOVERY_PORT, localIP, hostname, tcpPort: TCP_PORT });
discovery.start();

const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  
  ws.send(JSON.stringify({
    type: 'INIT',
    localIP,
    hostname,
    peers: tcpManager.getPeers()
  }));

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      if (msg.type === 'ADD_PEER') {
        tcpManager.connectToPeer(msg.ip);
      } else if (msg.type === 'SEND_MESSAGE') {
        tcpManager.sendToPeer(msg.targetIP, {
          type: 'CHAT',
          from: localIP,
          text: msg.text,
          timestamp: Date.now()
        });
      } else if (msg.type === 'REMOVE_PEER') {
        tcpManager.disconnect(msg.ip);
      }
    } catch (e) {
      console.error('WS parse error:', e);
    }
  });

  ws.on('close', () => {
    wsClients.delete(ws);
  });
});

function broadcastToWS(msgObj) {
  const msgStr = JSON.stringify(msgObj);
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msgStr);
    }
  }
}

tcpManager.on('peer-connected', (ip, name) => {
  broadcastToWS({ type: 'PEER_CONNECTED', ip, name });
});

tcpManager.on('peer-disconnected', (ip) => {
  broadcastToWS({ type: 'PEER_DISCONNECTED', ip });
});

tcpManager.on('message', (ip, msg) => {
  if (msg.type === 'CHAT') {
    broadcastToWS({
      type: 'INCOMING_MESSAGE',
      from: ip,
      text: msg.text,
      timestamp: msg.timestamp
    });
  }
});

discovery.on('discovered', (peer) => {
  broadcastToWS({ type: 'PEER_DISCOVERED', ip: peer.ip, name: peer.name });
  tcpManager.connectToPeer(peer.ip);
});

server.listen(HTTP_PORT, () => {
  console.log('=============================================');
  console.log(`IntraChat starting up...`);
  console.log(`Local IP: ${localIP}`);
  console.log(`Hostname: ${hostname}`);
  console.log(`HTTP UI running on port ${HTTP_PORT}`);
  console.log(`TCP P2P port: ${TCP_PORT}`);
  console.log(`Discovery UDP port: ${DISCOVERY_PORT}`);
  console.log(`Note: Make sure your firewall allows traffic on these ports.`);
  console.log('=============================================');
});

const gracefulShutdown = () => {
  console.log('Shutting down...');
  discovery.stop();
  if (tcpManager.server) tcpManager.server.close();
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
