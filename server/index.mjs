import http from 'node:http';
import { randomInt, randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 8080);
const MAX_PLAYERS = 5;
const MIN_PLAYERS = 3;
const MAX_CONNECTIONS = Number(process.env.MAX_CONNECTIONS || 500);
const MAX_MESSAGE_BYTES = 8 * 1024;
const RECONNECT_WINDOW_MS = 60_000;
const IDLE_ROOM_MS = 30 * 60_000;
const HEARTBEAT_MS = 25_000;
const rooms = new Map();
const connections = new Set();
const startedAt = Date.now();
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean));

const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const rankValue = (rank) => ranks.indexOf(rank);
const cardId = (rank, suit) => `${rank}-${suit}`;
const safeName = (value) => String(value || 'Player').trim().replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 18) || 'Player';

function log(event, data = {}) { console.log(JSON.stringify({ event, ...data, timestamp: new Date().toISOString() })); }
function createDeck() { return suits.flatMap((suit) => ranks.map((rank) => ({ id: cardId(rank, suit), rank, suit }))); }
function shuffle(deck) {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i -= 1) { const j = randomInt(i + 1); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
function makeCode() { let code = ''; do code = String(randomInt(100000, 1000000)); while (rooms.has(code)); return code; }
function publicRoom(room) {
  return { code: room.code, hostId: room.hostId, phase: room.phase, currentPlayerId: room.currentPlayerId, leadSuit: room.leadSuit, trick: room.trick, winnerPlayerId: room.winnerPlayerId, loserPlayerId: room.loserPlayerId, players: room.players.map((p) => ({ id: p.id, name: p.name, ready: p.ready, connected: Boolean(p.ws), cardCount: p.hand.length })) };
}
function personalState(room, player) { return { ...publicRoom(room), you: player.id, hand: player.hand }; }
function send(ws, message) { if (ws?.readyState === 1) ws.send(JSON.stringify(message)); }
function broadcast(room) { for (const player of room.players) send(player.ws, { type: 'state', state: personalState(room, player) }); }
function findPlayer(room, token) { return room.players.find((p) => p.token === token); }
function startGame(room) {
  if (room.players.length < MIN_PLAYERS || !room.players.every((p) => p.ready)) return false;
  const deck = shuffle(createDeck());
  room.players.forEach((player, index) => { player.hand = deck.filter((_, cardIndex) => cardIndex % room.players.length === index); player.ready = false; });
  const starter = room.players.find((p) => p.hand.some((card) => card.id === '2-clubs')) || room.players[0];
  room.phase = 'playing'; room.currentPlayerId = starter.id; room.leadSuit = null; room.trick = []; room.winnerPlayerId = null; room.loserPlayerId = null; room.lastActivityAt = Date.now();
  return true;
}
function legal(card, hand, leadSuit) { if (!leadSuit || card.suit === leadSuit) return true; return !hand.some((c) => c.suit === leadSuit); }
function play(room, player, cardIdToPlay) {
  if (room.phase !== 'playing') throw new Error('Game is not active.');
  if (room.currentPlayerId !== player.id) throw new Error('It is not your turn.');
  const cardIndex = player.hand.findIndex((c) => c.id === cardIdToPlay);
  if (cardIndex < 0) throw new Error('Card is not in your hand.');
  const card = player.hand[cardIndex];
  if (!legal(card, player.hand, room.leadSuit)) throw new Error(`You must follow ${room.leadSuit}.`);
  player.hand.splice(cardIndex, 1); room.leadSuit ||= card.suit; room.trick.push({ playerId: player.id, card }); room.lastActivityAt = Date.now();
  if (room.trick.length < room.players.length) { const index = room.players.findIndex((p) => p.id === player.id); room.currentPlayerId = room.players[(index + 1) % room.players.length].id; return; }
  const candidates = room.trick.filter(({ card: c }) => c.suit === room.leadSuit);
  const winner = candidates.reduce((best, current) => rankValue(current.card.rank) > rankValue(best.card.rank) ? current : best);
  room.winnerPlayerId = winner.playerId; room.trick = []; room.leadSuit = null; room.currentPlayerId = winner.playerId;
  if (room.players.every((p) => p.hand.length === 0)) { room.phase = 'finished'; room.loserPlayerId = winner.playerId; }
}
function attach(ws, room, player) {
  if (player.ws && player.ws !== ws) player.ws.close(4000, 'Reconnected elsewhere');
  player.ws = ws; player.disconnectedAt = null; ws.roomCode = room.code; ws.playerToken = player.token; ws.isAlive = true;
  send(ws, { type: 'welcome', playerId: player.id, token: player.token, roomCode: room.code }); broadcast(room);
}
function createRoom(name, ws) {
  const room = { code: makeCode(), hostId: '', phase: 'lobby', currentPlayerId: null, leadSuit: null, trick: [], winnerPlayerId: null, loserPlayerId: null, players: [], lastActivityAt: Date.now() };
  const player = { id: randomUUID(), token: randomUUID(), name: safeName(name), ready: false, hand: [], ws, disconnectedAt: null };
  room.hostId = player.id; room.players.push(player); rooms.set(room.code, room); log('room_created', { room: room.code, player: player.id }); attach(ws, room, player);
}
function joinRoom(code, name, ws) {
  const room = rooms.get(code);
  if (!room) return send(ws, { type: 'error', message: 'Room not found.' });
  if (room.phase !== 'lobby') return send(ws, { type: 'error', message: 'Game already started.' });
  if (room.players.length >= MAX_PLAYERS) return send(ws, { type: 'error', message: 'Room is full.' });
  const player = { id: randomUUID(), token: randomUUID(), name: safeName(name), ready: false, hand: [], ws, disconnectedAt: null };
  room.players.push(player); room.lastActivityAt = Date.now(); log('player_joined', { room: room.code, player: player.id }); attach(ws, room, player);
}
function reconnect(code, token, ws) {
  const room = rooms.get(code); const player = room && findPlayer(room, token);
  if (!player || (player.disconnectedAt && Date.now() - player.disconnectedAt > RECONNECT_WINDOW_MS)) return send(ws, { type: 'error', message: 'Reconnect session expired.' });
  attach(ws, room, player);
}
function allowedOrigin(origin) { return !origin || allowedOrigins.size === 0 || allowedOrigins.has(origin); }

const httpServer = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    const payload = { ok: true, service: 'thulla-multiplayer', rooms: rooms.size, connections: connections.size, uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000), timestamp: new Date().toISOString() };
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(payload)); return;
  }
  res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ ok: false, error: 'Not found' }));
});
const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });
httpServer.on('upgrade', (req, socket, head) => {
  if (!allowedOrigin(req.headers.origin)) { socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); socket.destroy(); return; }
  if (connections.size >= MAX_CONNECTIONS) { socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n'); socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

wss.on('connection', (ws, req) => {
  connections.add(ws); ws.isAlive = true; log('connection_open', { ip: req.socket.remoteAddress, connections: connections.size });
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (raw) => {
    if (raw.length > MAX_MESSAGE_BYTES) return ws.close(1009, 'Message too large');
    try {
      const message = JSON.parse(raw.toString());
      if (!message || typeof message.type !== 'string') throw new Error('Invalid message.');
      if (message.type === 'create_room') return createRoom(message.name, ws);
      if (message.type === 'join_room') return joinRoom(String(message.code || ''), message.name, ws);
      if (message.type === 'reconnect') return reconnect(String(message.code || ''), String(message.token || ''), ws);
      const room = rooms.get(ws.roomCode); const player = room && findPlayer(room, ws.playerToken);
      if (!room || !player) return send(ws, { type: 'error', message: 'Join a room first.' });
      if (message.type === 'ready') { if (room.phase !== 'lobby') return; player.ready = !player.ready; room.lastActivityAt = Date.now(); startGame(room); broadcast(room); }
      else if (message.type === 'start_game') { if (room.hostId !== player.id) return send(ws, { type: 'error', message: 'Only the host can start.' }); if (!startGame(room)) return send(ws, { type: 'error', message: `Need ${MIN_PLAYERS}-${MAX_PLAYERS} players and everyone ready.` }); broadcast(room); }
      else if (message.type === 'play_card') { try { play(room, player, String(message.cardId)); broadcast(room); } catch (error) { send(ws, { type: 'error', message: error.message }); } }
      else if (message.type === 'leave') { player.ws = null; player.disconnectedAt = Date.now(); broadcast(room); }
      else send(ws, { type: 'error', message: 'Unknown action.' });
    } catch { send(ws, { type: 'error', message: 'Invalid message.' }); }
  });
  ws.on('close', () => { connections.delete(ws); const room = rooms.get(ws.roomCode); const player = room && findPlayer(room, ws.playerToken); if (!room || !player || player.ws !== ws) return; player.ws = null; player.disconnectedAt = Date.now(); broadcast(room); log('connection_closed', { room: room.code, player: player.id, connections: connections.size }); });
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) { if (ws.isAlive === false) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); }
  const now = Date.now();
  for (const [code, room] of rooms) {
    room.players = room.players.filter((player) => player.ws || !player.disconnectedAt || now - player.disconnectedAt < RECONNECT_WINDOW_MS);
    if (!room.players.length || now - room.lastActivityAt > IDLE_ROOM_MS) { rooms.delete(code); continue; }
    if (!room.players.some((p) => p.id === room.hostId)) { room.hostId = room.players[0].id; broadcast(room); }
  }
}, HEARTBEAT_MS);
heartbeat.unref?.();

httpServer.listen(PORT, () => log('server_started', { port: PORT, allowedOrigins: [...allowedOrigins], maxConnections: MAX_CONNECTIONS }));
process.on('SIGTERM', () => { clearInterval(heartbeat); httpServer.close(() => process.exit(0)); });
process.on('SIGINT', () => { clearInterval(heartbeat); httpServer.close(() => process.exit(0)); });
