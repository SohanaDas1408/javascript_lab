const state = {
  localIP: '',
  hostname: '',
  peers: new Map(),        // ip → { name, connected, unread }
  chatHistory: new Map(),  // ip → [{ from, text, timestamp, sent }]
  activePeer: null,        // currently selected peer IP
  ws: null                 // WebSocket connection
};

// DOM Elements
const els = {
  localInfo: document.getElementById('local-info'),
  peerList: document.getElementById('peer-list'),
  peerIpInput: document.getElementById('peer-ip-input'),
  addPeerBtn: document.getElementById('add-peer-btn'),
  chatHeader: document.getElementById('chat-header'),
  messagesArea: document.getElementById('messages'),
  messageInputArea: document.getElementById('message-input-area'),
  messageInput: document.getElementById('message-input'),
  sendBtn: document.getElementById('send-btn'),
  connectionStatus: document.getElementById('connection-status')
};

// Initialize WebSocket
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  state.ws = new WebSocket(wsUrl);

  state.ws.onopen = () => {
    console.log('Connected to local backend');
    els.connectionStatus.classList.remove('disconnected');
    els.connectionStatus.textContent = '';
  };

  state.ws.onclose = () => {
    console.log('Disconnected from backend. Reconnecting...');
    els.connectionStatus.classList.add('disconnected');
    els.connectionStatus.textContent = 'Disconnected. Reconnecting...';
    setTimeout(initWebSocket, 3000);
  };

  state.ws.onerror = (err) => {
    console.error('WebSocket error:', err);
  };

  state.ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleWebSocketMessage(msg);
    } catch (e) {
      console.error('Failed to parse WS message:', e);
    }
  };
}

// Handle Incoming WebSocket Messages
function handleWebSocketMessage(msg) {
  switch (msg.type) {
    case 'INIT':
      state.localIP = msg.localIP;
      state.hostname = msg.hostname;
      els.localInfo.textContent = `Your IP: ${state.localIP}`;
      msg.peers.forEach(p => {
        state.peers.set(p.ip, { ...p, unread: 0 });
        if (!state.chatHistory.has(p.ip)) {
          state.chatHistory.set(p.ip, []);
        }
      });
      renderPeerList();
      break;

    case 'PEER_CONNECTED':
    case 'PEER_DISCOVERED': {
      const existing = state.peers.get(msg.ip) || { unread: 0 };
      state.peers.set(msg.ip, { ...existing, name: msg.name, connected: true });
      if (!state.chatHistory.has(msg.ip)) {
        state.chatHistory.set(msg.ip, []);
      }
      renderPeerList();
      if (state.activePeer === msg.ip) {
        updateChatHeader();
      }
      break;
    }

    case 'PEER_DISCONNECTED': {
      const p = state.peers.get(msg.ip);
      if (p) {
        p.connected = false;
        renderPeerList();
        if (state.activePeer === msg.ip) {
          updateChatHeader();
        }
      }
      break;
    }

    case 'INCOMING_MESSAGE': {
      const { from, text, timestamp } = msg;
      const history = state.chatHistory.get(from) || [];
      const newMsg = { from, text, timestamp, sent: false };
      history.push(newMsg);
      state.chatHistory.set(from, history);

      if (state.activePeer === from) {
        renderMessage(newMsg);
      } else {
        const peer = state.peers.get(from);
        if (peer) {
          peer.unread = (peer.unread || 0) + 1;
          renderPeerList();
        }
      }
      break;
    }
    
    default:
      console.log('Unknown message type:', msg.type);
  }
}

// Rendering
function renderPeerList() {
  els.peerList.innerHTML = '';
  
  // Sort peers: online first
  const sortedPeers = Array.from(state.peers.entries()).sort((a, b) => {
    if (a[1].connected === b[1].connected) return 0;
    return a[1].connected ? -1 : 1;
  });

  sortedPeers.forEach(([ip, peer]) => {
    const item = document.createElement('div');
    item.className = `peer-item ${state.activePeer === ip ? 'active' : ''}`;
    item.onclick = () => selectPeer(ip);

    const statusDot = document.createElement('div');
    statusDot.className = `status-dot ${peer.connected ? 'online' : 'offline'}`;
    item.appendChild(statusDot);

    const info = document.createElement('div');
    info.className = 'peer-info';
    
    const ipDiv = document.createElement('div');
    ipDiv.className = 'peer-ip';
    ipDiv.textContent = ip;
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'peer-name';
    nameDiv.textContent = peer.name || (peer.connected ? 'Connected' : 'Offline');
    
    info.appendChild(ipDiv);
    info.appendChild(nameDiv);
    item.appendChild(info);

    if (peer.unread > 0) {
      const badge = document.createElement('div');
      badge.className = 'unread-badge';
      badge.textContent = peer.unread > 99 ? '99+' : peer.unread;
      item.appendChild(badge);
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-peer-btn';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Remove peer';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      removePeer(ip);
    };
    item.appendChild(removeBtn);

    els.peerList.appendChild(item);
  });
}

function updateChatHeader() {
  if (!state.activePeer) return;
  const peer = state.peers.get(state.activePeer);
  if (!peer) return;
  
  const status = peer.connected ? '🟢 Online' : '⚫ Offline';
  els.chatHeader.innerHTML = `<span>Chat with <strong>${state.activePeer}</strong> ${peer.name ? `(${peer.name})` : ''} - ${status}</span>`;
}

function selectPeer(ip) {
  state.activePeer = ip;
  const peer = state.peers.get(ip);
  if (peer) {
    peer.unread = 0;
  }
  
  els.messageInputArea.style.display = 'flex';
  els.messagesArea.classList.remove('empty-state');
  
  updateChatHeader();
  renderPeerList();
  renderAllMessages();
  
  els.messageInput.focus();
}

function renderAllMessages() {
  els.messagesArea.innerHTML = '';
  if (!state.activePeer) return;
  
  const history = state.chatHistory.get(state.activePeer) || [];
  history.forEach(renderMessage);
  scrollToBottom();
}

function renderMessage(msg) {
  // Clear empty state text if it exists
  if (els.messagesArea.classList.contains('empty-state')) {
    els.messagesArea.innerHTML = '';
    els.messagesArea.classList.remove('empty-state');
  }

  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${msg.sent ? 'sent' : 'received'}`;
  
  const textDiv = document.createElement('div');
  textDiv.textContent = msg.text;
  msgDiv.appendChild(textDiv);
  
  const timeSpan = document.createElement('span');
  timeSpan.className = 'timestamp';
  timeSpan.textContent = formatTime(msg.timestamp);
  msgDiv.appendChild(timeSpan);
  
  els.messagesArea.appendChild(msgDiv);
  scrollToBottom();
}

function scrollToBottom() {
  els.messagesArea.scrollTop = els.messagesArea.scrollHeight;
}

function formatTime(ts) {
  const date = new Date(ts);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

// Actions
function addPeer() {
  const ip = els.peerIpInput.value.trim();
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  
  if (!ip) return;
  
  if (!ipRegex.test(ip)) {
    alert('Please enter a valid IP address format (e.g. 192.168.1.5)');
    return;
  }
  
  if (ip === state.localIP) {
    alert('Cannot add yourself!');
    return;
  }
  
  if (state.peers.has(ip)) {
    alert('Peer already in list');
    return;
  }

  // Send to backend
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: 'ADD_PEER', ip }));
  }
  
  // Add optimistic connecting state
  state.peers.set(ip, { name: 'connecting...', connected: false, unread: 0 });
  if (!state.chatHistory.has(ip)) {
    state.chatHistory.set(ip, []);
  }
  
  renderPeerList();
  els.peerIpInput.value = '';
}

function removePeer(ip) {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: 'REMOVE_PEER', ip }));
  }
  
  state.peers.delete(ip);
  state.chatHistory.delete(ip);
  
  if (state.activePeer === ip) {
    state.activePeer = null;
    els.messageInputArea.style.display = 'none';
    els.messagesArea.innerHTML = '<div class="icon">💬</div><div>Select a peer from the left to start chatting</div>';
    els.messagesArea.classList.add('empty-state');
    els.chatHeader.innerHTML = '<span>Select a peer to start chatting</span>';
  }
  
  renderPeerList();
}

function sendMessage() {
  const text = els.messageInput.value.trim();
  if (!text || !state.activePeer) return;
  
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: 'SEND_MESSAGE', targetIP: state.activePeer, text }));
    
    const timestamp = Date.now();
    const newMsg = { from: state.localIP, text, timestamp, sent: true };
    
    const history = state.chatHistory.get(state.activePeer) || [];
    history.push(newMsg);
    state.chatHistory.set(state.activePeer, history);
    
    renderMessage(newMsg);
    els.messageInput.value = '';
    els.messageInput.focus();
  } else {
    alert('Not connected to backend');
  }
}

// Event Listeners
els.addPeerBtn.addEventListener('click', addPeer);
els.peerIpInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addPeer();
});

els.sendBtn.addEventListener('click', sendMessage);
els.messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Start
initWebSocket();
