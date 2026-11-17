const dgram = require('dgram');
const EventEmitter = require('events');

class Discovery extends EventEmitter {
  constructor({ port, localIP, hostname, tcpPort }) {
    super();
    this.port = port;
    this.localIP = localIP;
    this.hostname = hostname;
    this.tcpPort = tcpPort;
    this.socket = null;
    this.intervalId = null;
    this.knownIPs = new Set();
  }

  start() {
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    
    this.socket.on('message', (msg, rinfo) => {
      const senderIP = rinfo.address;
      if (senderIP === this.localIP) return;

      try {
        const parsed = JSON.parse(msg.toString());
        if (parsed.type === 'ANNOUNCE') {
          if (!this.knownIPs.has(senderIP)) {
            this.knownIPs.add(senderIP);
            this.emit('discovered', {
              ip: senderIP,
              name: parsed.name,
              tcpPort: parsed.tcpPort
            });
          }
        }
      } catch (e) {
        // Ignore invalid UDP packets
      }
    });

    this.socket.on('listening', () => {
      this.socket.setBroadcast(true);
      
      this.intervalId = setInterval(() => {
        this.broadcast();
      }, 3000);
    });
    
    this.socket.on('error', (err) => {
      console.error('Discovery UDP error:', err);
    });

    this.socket.bind(this.port);
  }
  
  broadcast() {
    if (!this.socket) return;
    const msg = Buffer.from(JSON.stringify({
      type: 'ANNOUNCE',
      name: this.hostname,
      tcpPort: this.tcpPort
    }));
    
    this.socket.send(msg, 0, msg.length, this.port, '255.255.255.255', (err) => {
      if (err) console.error('Error broadcasting discovery:', err);
    });
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

module.exports = Discovery;
