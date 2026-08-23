import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { MultiplayerClient, multiplayerServerUrl, type RemoteCard, type RemoteState } from './multiplayer/client';

const client = new MultiplayerClient();
const avatar = (name: string) => name.trim().charAt(0).toUpperCase() || '?';
const suitSymbol = (suit: string) => ({ spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }[suit] || '•');
const isRed = (card: RemoteCard) => card.suit === 'hearts' || card.suit === 'diamonds';

function App() {
  const [state, setState] = useState<RemoteState | null>(null);
  const [name, setName] = useState('Hadi');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    client.onState((next) => { setState(next); setSelected(null); setError(''); });
    client.onError(setError);
    client.connect().then(() => setConnected(true)).catch((e) => setError(e.message));
    return () => client.destroy();
  }, []);

  const me = state?.players.find((p) => p.id === state.you);
  const legalCards = useMemo(() => {
    if (!state || !me) return new Set<string>();
    if (!state.leadSuit) return new Set(state.hand.map((card) => card.id));
    const follows = state.hand.some((card) => card.suit === state.leadSuit);
    return new Set(state.hand.filter((card) => !follows || card.suit === state.leadSuit).map((card) => card.id));
  }, [state, me]);

  const create = () => {
    setError('');
    client.createRoom(name.trim() || 'Player').catch((e) => setError(e.message));
  };

  const join = () => {
    setError('');
    if (!/^\d{6}$/.test(roomCode)) return setError('Enter a 6-digit room code.');
    client.joinRoom(roomCode, name.trim() || 'Player').catch((e) => setError(e.message));
  };

  if (!state) {
    return (
      <main className="app-shell lobby-shell">
        <section className="lobby-card">
          <div className="brand">THULLA <span>MASTER</span></div>
          <div className="subbrand">ONLINE MULTIPLAYER CARD GAME</div>
          <div className={`connection ${connected ? 'online' : ''}`}><span className="dot" /> {connected ? 'Server connected' : 'Connecting…'}</div>
          <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={18} /></label>
          <button className="primary lobby-action" onClick={create} disabled={!connected}>Create Room</button>
          <div className="divider"><span>OR</span></div>
          <label>Room code<input value={roomCode} onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="123456" /></label>
          <button className="secondary lobby-action" onClick={join} disabled={!connected}>Join Room</button>
          <p className="server-note">Server: {multiplayerServerUrl}</p>
          {error && <div className="toast inline-toast">{error}</div>}
        </section>
      </main>
    );
  }

  const players = state.players;
  const current = players.find((p) => p.id === state.currentPlayerId);
  const isHost = state.hostId === state.you;
  const myTurn = state.currentPlayerId === state.you;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><div className="brand">THULLA <span>MASTER</span></div><div className="subbrand">ORIGINAL MULTIPLAYER CARD GAME</div></div>
        <div className="room-pill">ROOM <strong>#{state.code}</strong></div>
      </header>

      {state.phase === 'lobby' ? (
        <section className="lobby-card room-lobby">
          <div className="room-heading"><div><h1>Room {state.code}</h1><p>Share this 6-digit code with your friends.</p></div><span className="player-count">{players.length}/5</span></div>
          <div className="room-players">
            {players.map((player) => <div className="room-player" key={player.id}><div className="avatar">{avatar(player.name)}</div><div><strong>{player.name}</strong><small>{player.id === state.hostId ? 'Host' : player.ready ? 'Ready' : 'Not ready'} · {player.connected ? 'Online' : 'Reconnecting…'}</small></div><span className={player.ready ? 'ready-badge' : 'waiting-badge'}>{player.ready ? 'READY' : 'WAITING'}</span></div>)}
          </div>
          <div className="lobby-actions"><button className="secondary" onClick={() => client.ready()}>{me?.ready ? 'Cancel Ready' : 'Ready'}</button>{isHost && <button className="primary" onClick={() => client.startGame()} disabled={players.length < 3 || !players.every((p) => p.ready)}>Start Game</button>}</div>
          <p className="lobby-help">3–5 players required. Everyone must be ready before the host starts.</p>
          {error && <div className="toast inline-toast">{error}</div>}
        </section>
      ) : (
        <>
          <section className="game-table">
            {players.filter((p) => p.id !== state.you).slice(0, 3).map((player, index) => <div className={`player player-${index === 0 ? 'top' : index === 1 ? 'left' : 'right'}`} key={player.id}><div className={`avatar ${state.currentPlayerId === player.id ? 'active' : ''}`}>{avatar(player.name)}</div><div><strong>{player.name}</strong><small>{player.cardCount} cards · {player.connected ? 'Online' : 'Offline'}</small></div></div>)}
            <div className="center-stack"><div className="table-badge">{state.phase === 'finished' ? 'GAME OVER' : myTurn ? 'YOUR TURN' : `${current?.name.toUpperCase() || 'PLAYER'}'S TURN`}</div><div className="trick-cards">{state.trick.length ? state.trick.map(({ playerId, card }) => <div className={`played-card ${isRed(card) ? 'red' : ''}`} key={`${playerId}-${card.id}`}><span>{card.rank}</span><small>{suitSymbol(card.suit)}</small></div>) : <div className="empty-trick">{state.phase === 'finished' ? 'Round complete' : 'Play a card'}</div>}</div><p>{state.leadSuit ? `Follow ${suitSymbol(state.leadSuit)} suit` : 'Lead any card'}</p>{state.winnerPlayerId && <p className="winner-note">Last trick: {players.find((p) => p.id === state.winnerPlayerId)?.name}</p>}</div>
            <div className="hand">{state.hand.map((card) => { const legal = legalCards.has(card.id); return <button className={`card ${isRed(card) ? 'red' : ''} ${selected === card.id ? 'selected' : ''}`} key={card.id} disabled={!myTurn || !legal || state.phase === 'finished'} onClick={() => setSelected(card.id)}><span>{card.rank}</span><small>{suitSymbol(card.suit)}</small></button>; })}</div>
          </section>
          <footer className="actionbar"><button className="secondary" onClick={() => client.leave()}>Leave Room</button><div className="status"><span className="dot" /> {state.phase === 'finished' ? `Bhabhi: ${players.find((p) => p.id === state.loserPlayerId)?.name || '—'}` : `${players.length}/5 players · ${me?.cardCount || state.hand.length} cards`}</div><button className="primary" disabled={!selected || !myTurn} onClick={() => selected && client.playCard(selected)}>Play Selected Card</button></footer>
          {error && <div className="toast">{error}</div>}
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
