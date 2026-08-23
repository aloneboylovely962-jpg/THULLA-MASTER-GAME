import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const suits = ['♠', '♥', '♦', '♣'];
const cards = ['A', 'K', 'Q', 'J', '10', '9', '8'];

function App() {
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
        <div className="player player-top">
          <div className="avatar">A</div>
          <div><strong>Ali</strong><small>3 cards</small></div>
        </div>
        <div className="player player-left">
          <div className="avatar">S</div>
          <div><strong>Saad</strong><small>5 cards</small></div>
        </div>
        <div className="player player-right">
          <div className="avatar">H</div>
          <div><strong>Hadi</strong><small>Your turn</small></div>
        </div>

        <div className="center-stack">
          <div className="table-badge">YOUR TURN</div>
          <div className="played-card"><span>Q</span><small>♥</small></div>
          <p>Follow the suit</p>
        </div>

        <div className="hand">
          {cards.map((rank, index) => (
            <button className={`card ${index === 2 ? 'selected' : ''}`} key={rank}>
              <span>{rank}</span>
              <small>{suits[index % suits.length]}</small>
            </button>
          ))}
        </div>
      </section>

      <footer className="actionbar">
        <button className="secondary">Leave Room</button>
        <div className="status"><span className="dot" /> Connected · Local Prototype</div>
        <button className="primary">Play Selected Card</button>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
