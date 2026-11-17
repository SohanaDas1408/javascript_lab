const net = require('net');
const EventEmitter = require('events');
const { createParser, serialize } = require('./message-parser');

class TCPManager extends EventEmitter {
  constructor({ port, localIP, hostname }) {
    super();
    this.port = port;
    this.localIP = localIP;
    this.hostname = hostname;
    
    this.peers = new Map();
    this.peerNames = new Map();
    this.server = null;
  }

  startServer() {
    this.server = net.createServer((socket) => {
      let peerIP = socket.remoteAddress;
      if (peerIP && peerIP.startsWith('::ffff:')) {
        peerIP = peerIP.substring(7);
      }
      
      if (!peerIP || peerIP === this.localIP) {
        socket.destroy();
        return;
      }

      if (this.peers.has(peerIP)) {
        const existingSocket = this.peers.get(peerIP);
        if (this.localIP < peerIP) {
          socket.destroy();
          return;
        } else {
          existingSocket.destroy();
        }
      }
      
      this._setupSocket(socket, peerIP);
    });

    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`TCP Server listening on port ${this.port}`);
    });
    
    this.server.on('error', (err) => {
      console.error('TCP Server error:', err);
    });
  }

  _setupSocket(socket, ip) {
    this.peers.set(ip, socket);
    
    const parser = createParser((msg) => {
      if (msg.type === 'HELLO') {
        this.peerNames.set(ip, msg.name || 'Unknown');
        this.emit('peer-connected', ip, msg.name || 'Unknown');
      } else {
        this.emit('message', ip, msg);
      }
    });

    socket.on('data', parser);
    
    socket.on('error', (err) => {
      console.error(`Socket error from ${ip}:`, err.message);
    });
    
    socket.on('close', () => {
      this.peers.delete(ip);
      this.peerNames.delete(ip);
      this.emit('peer-disconnected', ip);
    });

    socket.write(serialize({ type: 'HELLO', name: this.hostname }));
  }

  connectToPeer(ip) {
    if (this.peers.has(ip) || ip === this.localIP) return;

    const socket = net.createConnection({ host: ip, port: this.port }, () => {
      this._setupSocket(socket, ip);
    });
    
    socket.on('error', (err) => {
      console.error(`Connection error to ${ip}:`, err.message);
    });
    
    let reconnected = false;
    socket.once('close', () => {
      if (!reconnected) {
        reconnected = true;
        setTimeout(() => {
          if (!this.peers.has(ip)) {
            console.log(`Attempting reconnect to ${ip}...`);
            this.connectToPeer(ip);
          }
        }, 5000);
      }
    });
  }

  sendToPeer(ip, message) {
    const socket = this.peers.get(ip);
    if (socket && !socket.destroyed) {
      socket.write(serialize(message));
      return true;
    }
    return false;
  }

  getPeers() {
    return Array.from(this.peers.keys()).map(ip => ({
      ip,
      name: this.peerNames.get(ip) || 'Unknown',
      connected: true
    }));
  }

  disconnect(ip) {
    const socket = this.peers.get(ip);
    if (socket) {
      socket.destroy();
      this.peers.delete(ip);
      this.peerNames.delete(ip);
      this.emit('peer-disconnected', ip);
    }
  }
}

module.exports = TCPManager;
