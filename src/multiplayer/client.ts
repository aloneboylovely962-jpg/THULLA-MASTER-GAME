export type RemoteCard = { id: string; rank: string; suit: string };
export type RemotePlayer = { id: string; name: string; ready: boolean; connected: boolean; cardCount: number };
export type RemoteState = {
  code: string;
  hostId: string;
  phase: 'lobby' | 'playing' | 'finished';
  currentPlayerId: string | null;
  leadSuit: string | null;
  trick: { playerId: string; card: RemoteCard }[];
  winnerPlayerId: string | null;
  loserPlayerId: string | null;
  players: RemotePlayer[];
  you: string;
  hand: RemoteCard[];
};

type Listener = (state: RemoteState) => void;
type ErrorListener = (message: string) => void;

const storageKey = 'thulla-multiplayer-session';
const serverUrl = import.meta.env.VITE_SERVER_URL || 'ws://localhost:8080';

export class MultiplayerClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private errorListeners = new Set<ErrorListener>();
  private session: { code: string; token: string } | null = JSON.parse(localStorage.getItem(storageKey) || 'null');

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(serverUrl);
      this.socket.onopen = () => {
        if (this.session) {
          this.send({ type: 'reconnect', code: this.session.code, token: this.session.token });
        }
        resolve();
      };
      this.socket.onerror = () => reject(new Error('Unable to connect to multiplayer server.'));
      this.socket.onmessage = (event) => this.handle(event.data);
    });
  }

  async ensureConnected() {
    if (this.socket?.readyState === WebSocket.OPEN) return;
    await this.connect();
  }

  onState(listener: Listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  onError(listener: ErrorListener) { this.errorListeners.add(listener); return () => this.errorListeners.delete(listener); }

  async createRoom(name: string) {
    await this.ensureConnected();
    this.send({ type: 'create_room', name });
  }

  async joinRoom(code: string, name: string) {
    await this.ensureConnected();
    this.send({ type: 'join_room', code: code.trim(), name });
  }

  ready() { this.send({ type: 'ready' }); }
  startGame() { this.send({ type: 'start_game' }); }
  playCard(cardId: string) { this.send({ type: 'play_card', cardId }); }
  leave() { this.send({ type: 'leave' }); }

  destroy() {
    this.socket?.close();
    this.socket = null;
  }

  private send(message: Record<string, unknown>) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.errorListeners.forEach((listener) => listener('Multiplayer connection is not ready.'));
      return;
    }
    this.socket.send(JSON.stringify(message));
  }

  private handle(raw: string) {
    const message = JSON.parse(raw) as { type: string; state?: RemoteState; playerId?: string; token?: string; roomCode?: string; message?: string };
    if (message.type === 'welcome' && message.token && message.roomCode) {
      this.session = { code: message.roomCode, token: message.token };
      localStorage.setItem(storageKey, JSON.stringify(this.session));
    }
    if (message.type === 'state' && message.state) this.listeners.forEach((listener) => listener(message.state!));
    if (message.type === 'error' && message.message) this.errorListeners.forEach((listener) => listener(message.message!));
  }
}

export const multiplayerServerUrl = serverUrl;
