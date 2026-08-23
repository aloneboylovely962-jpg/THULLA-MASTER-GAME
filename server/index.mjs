import { WebSocketServer } from 'ws';
import { randomInt, randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT || 8080);
const MAX_PLAYERS = 5;
const MIN_PLAYERS = 3;
const rooms = new Map();

const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const rankValue = (rank) => ranks.indexOf(rank);
const cardId = (rank, suit) => `${rank}-${suit}`;

function createDeck() {
  return suits.flatMap((suit) => ranks.map((rank) => ({ id: cardId(rank, suit), rank, suit })));
}

function shuffle(deck) {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeCode() {
  let code = '';
  do code = String(randomInt(100000, 1000000)); while (rooms.has(code));
  return code;
}

function publicRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    currentPlayerId: room.currentPlayerId,
    leadSuit: room.leadSuit,
    trick: room.trick,
    winnerPlayerId: room.winnerPlayerId,
    loserPlayerId: room.loserPlayerId,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      ready: p.ready,
      connected: Boolean(p.ws),
      cardCount: p.hand.length,
    })),
  };
}

function personalState(room, player) {
  return { ...publicRoom(room), you: player.id, hand: player.hand };
}

function send(ws, message) {
  if (ws?.readyState === 1) ws.send(JSON.stringify(message));
}

function broadcast(room) {
  for (const player of room.players) {
    send(player.ws, { type: 'state', state: personalState(room, player) });
  }
}

function findPlayer(room, token) {
  return room.players.find((p) => p.token === token);
}

function startGame(room) {
  if (room.players.length < MIN_PLAYERS) return false;
  if (!room.players.every((p) => p.ready)) return false;
  const deck = shuffle(createDeck());
  room.players.forEach((player, index) => {
    player.hand = deck.filter((_, cardIndex) => cardIndex % room.players.length === index);
    player.ready = false;
  });
  const starter = room.players.find((p) => p.hand.some((card) => card.id === '2-clubs')) || room.players[0];
  room.phase = 'playing';
  room.currentPlayerId = starter.id;
  room.leadSuit = null;
  room.trick = [];
  room.winnerPlayerId = null;
  room.loserPlayerId = null;
  return true;
}

function legal(card, hand, leadSuit) {
  if (!leadSuit || card.suit === leadSuit) return true;
  return !hand.some((c) => c.suit === leadSuit);
}

function play(room, player, cardIdToPlay) {
  if (room.phase !== 'playing') throw new Error('Game is not active.');
  if (room.currentPlayerId !== player.id) throw new Error('It is not your turn.');
  const cardIndex = player.hand.findIndex((c) => c.id === cardIdToPlay);
  if (cardIndex < 0) throw new Error('Card is not in your hand.');
  const card = player.hand[cardIndex];
  if (!legal(card, player.hand, room.leadSuit)) throw new Error(`You must follow ${room.leadSuit}.`);
  player.hand.splice(cardIndex, 1);
  room.leadSuit ||= card.suit;
  room.trick.push({ playerId: player.id, card });

  if (room.trick.length < room.players.length) {
    const index = room.players.findIndex((p) => p.id === player.id);
    room.currentPlayerId = room.players[(index + 1) % room.players.length].id;
    return;
  }

  const candidates = room.trick.filter(({ card: c }) => c.suit === room.leadSuit);
  const winner = candidates.reduce((best, current) =>
    rankValue(current.card.rank) > rankValue(best.card.rank) ? current : best,
  );
  room.winnerPlayerId = winner.playerId;
  room.trick = [];
  room.leadSuit = null;
  room.currentPlayerId = winner.playerId;
  if (room.players.every((p) => p.hand.length === 0)) {
    room.phase = 'finished';
    room.loserPlayerId = winner.playerId;
  }
}

function attach(ws, room, player) {
  player.ws = ws;
  player.disconnectedAt = null;
  ws.roomCode = room.code;
  ws.playerToken = player.token;
  send(ws, { type: 'welcome', playerId: player.id, token: player.token, roomCode: room.code });
  broadcast(room);
}

function createRoom(name, ws) {
  const room = {
    code: makeCode(),
    hostId: '',
    phase: 'lobby',
    currentPlayerId: null,
    leadSuit: null,
    trick: [],
    winnerPlayerId: null,
    loserPlayerId: null,
    players: [],
  };
  const player = { id: randomUUID(), token: randomUUID(), name: name || 'Player', ready: false, hand: [], ws, disconnectedAt: null };
  room.hostId = player.id;
  room.players.push(player);
  rooms.set(room.code, room);
  attach(ws, room, player);
}

function joinRoom(code, name, ws) {
  const room = rooms.get(code);
  if (!room) return send(ws, { type: 'error', message: 'Room not found.' });
  if (room.phase !== 'lobby') return send(ws, { type: 'error', message: 'Game already started.' });
  if (room.players.length >= MAX_PLAYERS) return send(ws, { type: 'error', message: 'Room is full.' });
  const player = { id: randomUUID(), token: randomUUID(), name: name || 'Player', ready: false, hand: [], ws, disconnectedAt: null };
  room.players.push(player);
  attach(ws, room, player);
}

function reconnect(code, token, ws) {
  const room = rooms.get(code);
  const player = room && findPlayer(room, token);
  if (!player) return send(ws, { type: 'error', message: 'Reconnect session expired.' });
  attach(ws, room, player);
}

const wss = new WebSocketServer({ port: PORT });
console.log(`Thulla multiplayer server listening on :${PORT}`);

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      if (message.type === 'create_room') return createRoom(message.name, ws);
      if (message.type === 'join_room') return joinRoom(String(message.code || ''), message.name, ws);
      if (message.type === 'reconnect') return reconnect(String(message.code || ''), String(message.token || ''), ws);

      const room = rooms.get(ws.roomCode);
      const player = room && findPlayer(room, ws.playerToken);
      if (!room || !player) return send(ws, { type: 'error', message: 'Join a room first.' });

      if (message.type === 'ready') {
        if (room.phase !== 'lobby') return;
        player.ready = !player.ready;
        startGame(room);
        broadcast(room);
      } else if (message.type === 'start_game') {
        if (room.hostId !== player.id) return send(ws, { type: 'error', message: 'Only the host can start.' });
        if (!startGame(room)) return send(ws, { type: 'error', message: `Need ${MIN_PLAYERS}-${MAX_PLAYERS} players and everyone ready.` });
        broadcast(room);
      } else if (message.type === 'play_card') {
        try { play(room, player, String(message.cardId)); broadcast(room); }
        catch (error) { send(ws, { type: 'error', message: error.message }); }
      } else if (message.type === 'leave') {
        player.ws = null;
        player.disconnectedAt = Date.now();
        broadcast(room);
      }
    } catch {
      send(ws, { type: 'error', message: 'Invalid message.' });
    }
  });

  ws.on('close', () => {
    const room = rooms.get(ws.roomCode);
    const player = room && findPlayer(room, ws.playerToken);
    if (!room || !player || player.ws !== ws) return;
    player.ws = null;
    player.disconnectedAt = Date.now();
    broadcast(room);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    room.players = room.players.filter((player) => player.ws || !player.disconnectedAt || now - player.disconnectedAt < 60_000);
    if (!room.players.length) rooms.delete(code);
    else if (!room.players.some((p) => p.id === room.hostId)) room.hostId = room.players[0].id;
  }
}, 15_000);
