import http from 'node:http';
import { randomInt, randomUUID, scrypt as scryptCallback, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { WebSocketServer } from 'ws';
import pg from 'pg';

const { Pool } = pg;
const scrypt = promisify(scryptCallback);
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
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean));
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false } }) : null;

const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const rankValue = (rank) => ranks.indexOf(rank);
const cardId = (rank, suit) => `${rank}-${suit}`;
const safeName = (value) => String(value || 'Player').trim().replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 18) || 'Player';
const safeUsername = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET,POST,OPTIONS' }); res.end(JSON.stringify(body)); };
const body = (req) => new Promise((resolve, reject) => { let data = ''; req.on('data', (chunk) => { data += chunk; if (data.length > 32_000) reject(new Error('Request too large')); }); req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('Invalid JSON')); } }); req.on('error', reject); });
const tokenFrom = (req) => String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
function log(event, data = {}) { console.log(JSON.stringify({ event, ...data, timestamp: new Date().toISOString() })); }
async function hashPassword(password) { const salt = randomBytes(16).toString('hex'); const key = await scrypt(password, salt, 64); return `${salt}:${Buffer.from(key).toString('hex')}`; }
async function verifyPassword(password, stored) { const [salt, hex] = String(stored).split(':'); if (!salt || !hex) return false; const key = await scrypt(password, salt, 64); const expected = Buffer.from(hex, 'hex'); return expected.length === key.length && timingSafeEqual(expected, Buffer.from(key)); }
async function createSession(userId) { if (!pool) throw new Error('Database is not configured.'); const token = randomUUID() + randomUUID().replaceAll('-', ''); await pool.query('INSERT INTO sessions(token,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL \'30 days\')', [token, userId]); return token; }
async function authUser(req) { if (!pool) return null; const token = tokenFrom(req); if (!token) return null; const result = await pool.query('SELECT u.id,u.username,u.display_name,u.coins,u.xp,u.level,u.wins,u.losses,u.games_played FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1 AND s.expires_at>NOW()', [token]); return result.rows[0] || null; }
async function ensureSchema() {
  if (!pool) { log('database_disabled'); return; }
  await pool.query(`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, username VARCHAR(20) UNIQUE NOT NULL, display_name VARCHAR(18) NOT NULL, password_hash TEXT NOT NULL, coins INTEGER NOT NULL DEFAULT 500, xp INTEGER NOT NULL DEFAULT 0, level INTEGER NOT NULL DEFAULT 1, wins INTEGER NOT NULL DEFAULT 0, losses INTEGER NOT NULL DEFAULT 0, games_played INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL); CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);`);
}
async function profileFor(userId) { const result = await pool.query('SELECT id,username,display_name,coins,xp,level,wins,losses,games_played,created_at FROM users WHERE id=$1', [userId]); return result.rows[0] || null; }
async function rewardMatch(room) {
  if (!pool || room.rewarded || room.phase !== 'finished') return;
  room.rewarded = true;
  for (const player of room.players) {
    if (!player.userId) continue;
    const loser = player.id === room.loserPlayerId;
    const coins = loser ? 20 : 50;
    const xp = loser ? 40 : 100;
    await pool.query(`UPDATE users SET coins=coins+$1, xp=xp+$2, level=1+FLOOR((xp+$2)/1000)::int, wins=wins+$3, losses=losses+$4, games_played=games_played+1 WHERE id=$5`, [coins, xp, loser ? 0 : 1, loser ? 1 : 0, player.userId]);
  }
}
function createDeck() { return suits.flatMap((suit) => ranks.map((rank) => ({ id: cardId(rank, suit), rank, suit }))); }
function shuffle(deck) { const copy = [...deck]; for (let i = copy.length - 1; i > 0; i -= 1) { const j = randomInt(i + 1); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; }
function makeCode() { let code = ''; do code = String(randomInt(100000, 1000000)); while (rooms.has(code)); return code; }
function publicRoom(room) { return { code: room.code, hostId: room.hostId, phase: room.phase, currentPlayerId: room.currentPlayerId, leadSuit: room.leadSuit, trick: room.trick, winnerPlayerId: room.winnerPlayerId, loserPlayerId: room.loserPlayerId, players: room.players.map((p) => ({ id: p.id, name: p.name, ready: p.ready, connected: Boolean(p.ws), cardCount: p.hand.length })) }; }
function personalState(room, player) { return { ...publicRoom(room), you: player.id, hand: player.hand }; }
function send(ws, message) { if (ws?.readyState === 1) ws.send(JSON.stringify(message)); }
function broadcast(room) { for (const player of room.players) send(player.ws, { type: 'state', state: personalState(room, player) }); }
function findPlayer(room, token) { return room.players.find((p) => p.token === token); }
function startGame(room) { if (room.players.length < MIN_PLAYERS || !room.players.every((p) => p.ready)) return false; const deck = shuffle(createDeck()); room.players.forEach((player, index) => { player.hand = deck.filter((_, cardIndex) => cardIndex % room.players.length === index); player.ready = false; }); const starter = room.players.find((p) => p.hand.some((card) => card.id === '2-clubs')) || room.players[0]; room.phase = 'playing'; room.currentPlayerId = starter.id; room.leadSuit = null; room.trick = []; room.winnerPlayerId = null; room.loserPlayerId = null; room.rewarded = false; room.lastActivityAt = Date.now(); return true; }
function legal(card, hand, leadSuit) { if (!leadSuit || card.suit === leadSuit) return true; return !hand.some((c) => c.suit === leadSuit); }
async function play(room, player, cardIdToPlay) { if (room.phase !== 'playing') throw new Error('Game is not active.'); if (room.currentPlayerId !== player.id) throw new Error('It is not your turn.'); const cardIndex = player.hand.findIndex((c) => c.id === cardIdToPlay); if (cardIndex < 0) throw new Error('Card is not in your hand.'); const card = player.hand[cardIndex]; if (!legal(card, player.hand, room.leadSuit)) throw new Error(`You must follow ${room.leadSuit}.`); player.hand.splice(cardIndex, 1); room.leadSuit ||= card.suit; room.trick.push({ playerId: player.id, card }); room.lastActivityAt = Date.now(); if (room.trick.length < room.players.length) { const index = room.players.findIndex((p) => p.id === player.id); room.currentPlayerId = room.players[(index + 1) % room.players.length].id; return; } const candidates = room.trick.filter(({ card: c }) => c.suit === room.leadSuit); const winner = candidates.reduce((best, current) => rankValue(current.card.rank) > rankValue(best.card.rank) ? current : best); room.winnerPlayerId = winner.playerId; room.trick = []; room.leadSuit = null; room.currentPlayerId = winner.playerId; if (room.players.every((p) => p.hand.length === 0)) { room.phase = 'finished'; room.loserPlayerId = winner.playerId; await rewardMatch(room); } }
function attach(ws, room, player) { if (player.ws && player.ws !== ws) player.ws.close(4000, 'Reconnected elsewhere'); player.ws = ws; player.disconnectedAt = null; ws.roomCode = room.code; ws.playerToken = player.token; ws.isAlive = true; send(ws, { type: 'welcome', playerId: player.id, token: player.token, roomCode: room.code }); broadcast(room); }
async function createRoom(name, user, ws) { const room = { code: makeCode(), hostId: '', phase: 'lobby', currentPlayerId: null, leadSuit: null, trick: [], winnerPlayerId: null, loserPlayerId: null, rewarded: false, players: [], lastActivityAt: Date.now() }; const player = { id: randomUUID(), token: randomUUID(), userId: user?.id || null, name: safeName(user?.display_name || name), ready: false, hand: [], ws, disconnectedAt: null }; room.hostId = player.id; room.players.push(player); rooms.set(room.code, room); log('room_created', { room: room.code, player: player.id, userId: player.userId }); attach(ws, room, player); }
async function joinRoom(code, name, user, ws) { const room = rooms.get(code); if (!room) return send(ws, { type: 'error', message: 'Room not found.' }); if (room.phase !== 'lobby') return send(ws, { type: 'error', message: 'Game already started.' }); if (room.players.length >= MAX_PLAYERS) return send(ws, { type: 'error', message: 'Room is full.' }); const player = { id: randomUUID(), token: randomUUID(), userId: user?.id || null, name: safeName(user?.display_name || name), ready: false, hand: [], ws, disconnectedAt: null }; room.players.push(player); room.lastActivityAt = Date.now(); log('player_joined', { room: room.code, player: player.id, userId: player.userId }); attach(ws, room, player); }
function reconnect(code, token, ws) { const room = rooms.get(code); const player = room && findPlayer(room, token); if (!player || (player.disconnectedAt && Date.now() - player.disconnectedAt > RECONNECT_WINDOW_MS)) return send(ws, { type: 'error', message: 'Reconnect session expired.' }); attach(ws, room, player); }
function allowedOrigin(origin) { return !origin || allowedOrigins.size === 0 || allowedOrigins.has(origin); }

const httpServer = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  try {
    if (req.url === '/health' || req.url === '/') return json(res, 200, { ok: true, service: 'thulla-multiplayer', database: Boolean(pool), rooms: rooms.size, connections: connections.size, uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000), timestamp: new Date().toISOString() });
    if (req.url === '/api/auth/register' && req.method === 'POST') { if (!pool) return json(res, 503, { error: 'Accounts require DATABASE_URL.' }); const data = await body(req); const username = safeUsername(data.username); const displayName = safeName(data.displayName || username); const password = String(data.password || ''); if (!/^[a-z0-9_]{3,20}$/.test(username)) return json(res, 400, { error: 'Username must be 3-20 letters, numbers or underscore.' }); if (password.length < 6) return json(res, 400, { error: 'Password must be at least 6 characters.' }); const hash = await hashPassword(password); const id = randomUUID(); try { await pool.query('INSERT INTO users(id,username,display_name,password_hash) VALUES($1,$2,$3,$4)', [id, username, displayName, hash]); } catch { return json(res, 409, { error: 'Username already exists.' }); } const token = await createSession(id); return json(res, 201, { token, profile: await profileFor(id) }); }
    if (req.url === '/api/auth/login' && req.method === 'POST') { if (!pool) return json(res, 503, { error: 'Accounts require DATABASE_URL.' }); const data = await body(req); const username = safeUsername(data.username); const result = await pool.query('SELECT id,password_hash FROM users WHERE username=$1', [username]); if (!result.rows[0] || !(await verifyPassword(String(data.password || ''), result.rows[0].password_hash))) return json(res, 401, { error: 'Invalid username or password.' }); const token = await createSession(result.rows[0].id); return json(res, 200, { token, profile: await profileFor(result.rows[0].id) }); }
    if (req.url === '/api/auth/me' && req.method === 'GET') { const user = await authUser(req); return user ? json(res, 200, { profile: user }) : json(res, 401, { error: 'Not signed in.' }); }
    if (req.url === '/api/auth/logout' && req.method === 'POST') { if (pool) await pool.query('DELETE FROM sessions WHERE token=$1', [tokenFrom(req)]); return json(res, 200, { ok: true }); }
    if (req.url === '/api/profile' && req.method === 'GET') { const user = await authUser(req); return user ? json(res, 200, { profile: user }) : json(res, 401, { error: 'Not signed in.' }); }
    return json(res, 404, { ok: false, error: 'Not found' });
  } catch (error) { log('http_error', { message: error.message }); return json(res, 500, { error: 'Server error.' }); }
});

const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });
httpServer.on('upgrade', (req, socket, head) => { if (!allowedOrigin(req.headers.origin)) { socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); socket.destroy(); return; } if (connections.size >= MAX_CONNECTIONS) { socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n'); socket.destroy(); return; } wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req)); });

wss.on('connection', (ws, req) => {
  connections.add(ws); ws.isAlive = true; log('connection_open', { ip: req.socket.remoteAddress, connections: connections.size }); ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', async (raw) => { if (raw.length > MAX_MESSAGE_BYTES) return ws.close(1009, 'Message too large'); try { const message = JSON.parse(raw.toString()); if (!message || typeof message.type !== 'string') throw new Error('Invalid message.'); if (message.type === 'create_room' || message.type === 'join_room') { let user = null; if (pool && message.authToken) { const fakeReq = { headers: { authorization: `Bearer ${message.authToken}` } }; user = await authUser(fakeReq); } if (message.type === 'create_room') return createRoom(message.name, user, ws); return joinRoom(String(message.code || ''), message.name, user, ws); } if (message.type === 'reconnect') return reconnect(String(message.code || ''), String(message.token || ''), ws); const room = rooms.get(ws.roomCode); const player = room && findPlayer(room, ws.playerToken); if (!room || !player) return send(ws, { type: 'error', message: 'Join a room first.' }); if (message.type === 'ready') { if (room.phase !== 'lobby') return; player.ready = !player.ready; room.lastActivityAt = Date.now(); startGame(room); broadcast(room); } else if (message.type === 'start_game') { if (room.hostId !== player.id) return send(ws, { type: 'error', message: 'Only the host can start.' }); if (!startGame(room)) return send(ws, { type: 'error', message: `Need ${MIN_PLAYERS}-${MAX_PLAYERS} players and everyone ready.` }); broadcast(room); } else if (message.type === 'play_card') { try { await play(room, player, String(message.cardId)); broadcast(room); } catch (error) { send(ws, { type: 'error', message: error.message }); } } else if (message.type === 'leave') { player.ws = null; player.disconnectedAt = Date.now(); broadcast(room); } else send(ws, { type: 'error', message: 'Unknown action.' }); } catch (error) { log('ws_error', { message: error.message }); send(ws, { type: 'error', message: 'Invalid message.' }); } });
  ws.on('close', () => { connections.delete(ws); const room = rooms.get(ws.roomCode); const player = room && findPlayer(room, ws.playerToken); if (!room || !player || player.ws !== ws) return; player.ws = null; player.disconnectedAt = Date.now(); broadcast(room); log('connection_closed', { room: room.code, player: player.id, connections: connections.size }); });
});

const heartbeat = setInterval(() => { for (const ws of wss.clients) { if (ws.isAlive === false) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); } const now = Date.now(); for (const [code, room] of rooms) { room.players = room.players.filter((player) => player.ws || !player.disconnectedAt || now - player.disconnectedAt < RECONNECT_WINDOW_MS); if (!room.players.length || now - room.lastActivityAt > IDLE_ROOM_MS) { rooms.delete(code); continue; } if (!room.players.some((p) => p.id === room.hostId)) { room.hostId = room.players[0].id; broadcast(room); } } }, HEARTBEAT_MS); heartbeat.unref?.();

ensureSchema().then(() => httpServer.listen(PORT, () => log('server_started', { port: PORT, database: Boolean(pool), allowedOrigins: [...allowedOrigins], maxConnections: MAX_CONNECTIONS }))).catch((error) => { log('startup_error', { message: error.message }); process.exit(1); });
process.on('SIGTERM', () => { clearInterval(heartbeat); pool?.end().finally(() => httpServer.close(() => process.exit(0))); });
process.on('SIGINT', () => { clearInterval(heartbeat); pool?.end().finally(() => httpServer.close(() => process.exit(0))); });
