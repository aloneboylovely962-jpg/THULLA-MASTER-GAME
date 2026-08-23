import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import {
  Card,
  GameState,
  cardCanBePlayed,
  createDeck,
  createGame,
  playCard,
  shuffle,
  suitSymbol,
} from './game/engine';

const players = [
  { id: 'ali', name: 'Ali' },
  { id: 'saad', name: 'Saad' },
  { id: 'hadi', name: 'Hadi' },
  { id: 'zain', name: 'Zain' },
];

const playerAvatar: Record<string, string> = { ali: 'A', saad: 'S', hadi: 'H', zain: 'Z' };

function makeNewGame(): GameState {
  const deck = shuffle(createDeck());
  const starterIndex = 2;
  const twoClubsIndex = deck.findIndex((card) => card.id === '2-clubs');
  [deck[starterIndex], deck[twoClubsIndex]] = [deck[twoClubsIndex], deck[starterIndex]];
  return createGame(players.map((player) => ({ ...player, hand: [] })), deck);
}

function CardView({ card, selected, disabled, onClick }: { card: Card; selected: boolean; disabled: boolean; onClick: () => void }) {
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  return (
    <button
      className={`card ${red ? 'red' : ''} ${selected ? 'selected' : ''}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={`${card.rank} of ${card.suit}`}
    >
      <span>{card.rank}</span>
      <small>{suitSymbol(card.suit)}</small>
    </button>
  );
}

function App() {
  const [game, setGame] = useState<GameState>(() => makeNewGame());
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [error, setError] = useState('');

  const me = game.players.find((player) => player.id === 'hadi')!;
  const currentPlayer = game.players.find((player) => player.id === game.currentPlayerId)!;
  const topPlayers = game.players.filter((player) => player.id !== 'hadi');

  useEffect(() => {
    setSelectedCard(null);
    setError('');
  }, [game.currentPlayerId, game.trick.length]);

  useEffect(() => {
    if (game.phase !== 'playing' || game.currentPlayerId === 'hadi') return;
    const timer = window.setTimeout(() => {
      setGame((current) => {
        const bot = current.players.find((player) => player.id === current.currentPlayerId);
        if (!bot) return current;
        const legal = bot.hand.filter((card) => cardCanBePlayed(card, bot.hand, current.leadSuit));
        const card = legal[Math.floor(Math.random() * legal.length)];
        return playCard(current, bot.id, card.id);
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [game.currentPlayerId, game.phase]);

  const legalCards = useMemo(
    () => new Set(me.hand.filter((card) => cardCanBePlayed(card, me.hand, game.leadSuit)).map((card) => card.id)),
    [me.hand, game.leadSuit],
  );

  const playSelected = () => {
    if (!selectedCard) return;
    try {
      setGame((current) => playCard(current, 'hadi', selectedCard));
      setSelectedCard(null);
    } catch (playError) {
      setError(playError instanceof Error ? playError.message : 'Card cannot be played.');
    }
  };

  const restart = () => {
    setGame(makeNewGame());
    setSelectedCard(null);
    setError('');
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand">THULLA <span>MASTER</span></div>
          <div className="subbrand">ORIGINAL MULTIPLAYER CARD GAME</div>
        </div>
        <div className="room-pill">ROOM <strong>#TM-2048</strong></div>
      </header>

      <section className="game-table">
        {topPlayers.map((player, index) => (
          <div className={`player player-${index === 0 ? 'top' : index === 1 ? 'left' : 'right'}`} key={player.id}>
            <div className={`avatar ${game.currentPlayerId === player.id ? 'active' : ''}`}>{playerAvatar[player.id]}</div>
            <div><strong>{player.name}</strong><small>{player.hand.length} cards</small></div>
          </div>
        ))}

        <div className="center-stack">
          <div className="table-badge">{game.phase === 'finished' ? 'GAME OVER' : `${currentPlayer.name.toUpperCase()}'S TURN`}</div>
          <div className="trick-cards">
            {game.trick.length ? game.trick.map(({ playerId, card }) => (
              <div className="played-card" key={`${playerId}-${card.id}`}>
                <span>{card.rank}</span><small>{suitSymbol(card.suit)}</small>
              </div>
            )) : <div className="empty-trick">{game.lastTrickWinnerId ? 'Next trick' : 'Play a card'}</div>}
          </div>
          <p>{game.leadSuit ? `Follow ${suitSymbol(game.leadSuit)} suit` : 'Lead any card'}</p>
          {game.winnerPlayerId && <p className="winner-note">Trick won by {game.players.find((p) => p.id === game.winnerPlayerId)?.name}</p>}
        </div>

        <div className="hand">
          {me.hand.map((card) => {
            const legal = legalCards.has(card.id);
            return (
              <CardView
                key={card.id}
                card={card}
                selected={selectedCard === card.id}
                disabled={game.currentPlayerId !== 'hadi' || !legal || game.phase === 'finished'}
                onClick={() => { setError(''); setSelectedCard(card.id); }}
              />
            );
          })}
        </div>
      </section>

      <footer className="actionbar">
        <button className="secondary" onClick={restart}>New Game</button>
        <div className="status"><span className="dot" /> {game.phase === 'finished' ? `Bhabhi: ${game.players.find((p) => p.id === game.loserPlayerId)?.name}` : `${me.hand.length} cards · ${currentPlayer.name}'s turn`}</div>
        <button className="primary" disabled={!selectedCard || game.currentPlayerId !== 'hadi'} onClick={playSelected}>Play Selected Card</button>
      </footer>
      {error && <div className="toast">{error}</div>}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
