export type RemoteCard = { id: string; rank: string; suit: string };
export type RemotePlayer = { id: string; name: string; ready: boolean; connected: boolean; cardCount: number };
export type RemoteState = { code: string; hostId: string; phase: 'lobby' | 'playing' | 'finished'; currentPlayerId: string | null; leadSuit: string | null; trick: { playerId: string; card: RemoteCard }[]; winnerPlayerId: string | null; loserPlayerId: string | null; players: RemotePlayer[]; you: string; hand: RemoteCard[] };
type Listener = (state: RemoteState) => void;
type ErrorListener = (message: string) => void;
const storageKey = 'thulla-multiplayer-session';
const authKey = 'thulla-auth-token';
const serverUrl = import.meta.env.VITE_SERVER_URL || 'ws://localhost:8080';

export class MultiplayerClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private errorListeners = new Set<ErrorListener>();
  private session: { code: string; token: string } | null = JSON.parse(localStorage.getItem(storageKey) || 'null');
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private closedByUser = false;
  get authToken() { return localStorage.getItem(authKey) || ''; }
  setAuthToken(token: string) { localStorage.setItem(authKey, token); }
  clearAuthToken() { localStorage.removeItem(authKey); }

  connect(): Promise<void> { this.closedByUser = false; return new Promise((resolve, reject) => { if (this.socket?.readyState === WebSocket.OPEN) return resolve(); const socket = new WebSocket(serverUrl); this.socket = socket; let settled = false; socket.onopen = () => { this.reconnectAttempt = 0; if (this.session) this.send({ type: 'reconnect', code: this.session.code, token: this.session.token }); settled = true; resolve(); }; socket.onerror = () => { if (!settled) { settled = true; reject(new Error('Unable to connect to multiplayer server.')); } }; socket.onclose = () => { if (this.socket === socket) this.socket = null; if (!this.closedByUser) this.scheduleReconnect(); }; socket.onmessage = (event) => this.handle(event.data); }); }
  async ensureConnected() { if (this.socket?.readyState === WebSocket.OPEN) return; await this.connect(); }
  onState(listener: Listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  onError(listener: ErrorListener) { this.errorListeners.add(listener); return () => this.errorListeners.delete(listener); }
  async createRoom(name: string) { await this.ensureConnected(); this.send({ type: 'create_room', name, authToken: this.authToken }); }
  async joinRoom(code: string, name: string) { await this.ensureConnected(); this.send({ type: 'join_room', code: code.trim(), name, authToken: this.authToken }); }
  ready() { this.send({ type: 'ready' }); }
  startGame() { this.send({ type: 'start_game' }); }
  playCard(cardId: string) { this.send({ type: 'play_card', cardId }); }
  leave() { this.send({ type: 'leave' }); }
  destroy() { this.closedByUser = true; if (this.reconnectTimer) clearTimeout(this.reconnectTimer); this.reconnectTimer = null; this.socket?.close(); this.socket = null; }
  private scheduleReconnect() { if (this.reconnectTimer || this.closedByUser || !this.session) return; const delay = Math.min(30_000, 1_000 * 2 ** this.reconnectAttempt); this.reconnectAttempt += 1; this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; this.connect().catch(() => this.scheduleReconnect()); }, delay); }
  private send(message: Record<string, unknown>) { if (this.socket?.readyState !== WebSocket.OPEN) { this.errorListeners.forEach((listener) => listener('Multiplayer connection is not ready.')); return; } this.socket.send(JSON.stringify(message)); }
  private handle(raw: string) { try { const message = JSON.parse(raw) as { type: string; state?: RemoteState; token?: string; roomCode?: string; message?: string }; if (message.type === 'welcome' && message.token && message.roomCode) { this.session = { code: message.roomCode, token: message.token }; localStorage.setItem(storageKey, JSON.stringify(this.session)); } if (message.type === 'state' && message.state) this.listeners.forEach((listener) => listener(message.state!)); if (message.type === 'error' && message.message) this.errorListeners.forEach((listener) => listener(message.message!)); } catch { this.errorListeners.forEach((listener) => listener('Received an invalid server response.')); } }
}
export const multiplayerServerUrl = serverUrl;
export const accountApiUrl = serverUrl.replace(/^ws/, 'http');
export const authStorageKey = authKey;
