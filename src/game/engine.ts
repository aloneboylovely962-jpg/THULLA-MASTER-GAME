export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A',
] as const;
export type Rank = (typeof RANKS)[number];

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
};

export type PlayerState = {
  id: string;
  name: string;
  hand: Card[];
  folded?: boolean;
};

export type TrickCard = {
  playerId: string;
  card: Card;
};

export type GameState = {
  players: PlayerState[];
  currentPlayerId: string;
  trick: TrickCard[];
  leadSuit: Suit | null;
  winnerPlayerId: string | null;
  lastTrickWinnerId: string | null;
  phase: 'playing' | 'finished';
  loserPlayerId: string | null;
};

const rankValue = (rank: Rank) => RANKS.indexOf(rank);

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({ id: `${rank}-${suit}`, suit, rank })),
  );
}

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function dealCards(players: PlayerState[], deck = shuffle(createDeck())): PlayerState[] {
  return players.map((player, index) => ({
    ...player,
    hand: deck.filter((_, cardIndex) => cardIndex % players.length === index),
    folded: false,
  }));
}

export function cardCanBePlayed(card: Card, hand: Card[], leadSuit: Suit | null): boolean {
  if (!leadSuit) return true;
  if (card.suit === leadSuit) return true;
  return !hand.some((handCard) => handCard.suit === leadSuit);
}

export function getWinner(trick: TrickCard[], leadSuit: Suit): TrickCard | null {
  const suitCards = trick.filter(({ card }) => card.suit === leadSuit);
  if (!suitCards.length) return null;
  return suitCards.reduce((best, current) =>
    rankValue(current.card.rank) > rankValue(best.card.rank) ? current : best,
  );
}

export function findStartingPlayer(players: PlayerState[]): string {
  const starter = players.find((player) => player.hand.some((card) => card.id === '2-clubs'));
  return starter?.id ?? players[0].id;
}

export function createGame(players: PlayerState[], deck?: Card[]): GameState {
  if (players.length < 3 || players.length > 5) {
    throw new Error('Thulla requires 3 to 5 players.');
  }
  const dealt = dealCards(players, deck);
  return {
    players: dealt,
    currentPlayerId: findStartingPlayer(dealt),
    trick: [],
    leadSuit: null,
    winnerPlayerId: null,
    lastTrickWinnerId: null,
    phase: 'playing',
    loserPlayerId: null,
  };
}

export function playCard(state: GameState, playerId: string, cardId: string): GameState {
  if (state.phase !== 'playing') throw new Error('The game has finished.');
  if (state.currentPlayerId !== playerId) throw new Error('It is not this player’s turn.');

  const player = state.players.find((item) => item.id === playerId);
  if (!player) throw new Error('Player not found.');
  const card = player.hand.find((item) => item.id === cardId);
  if (!card) throw new Error('Card not found in player hand.');
  if (!cardCanBePlayed(card, player.hand, state.leadSuit)) {
    throw new Error(`You must follow ${state.leadSuit}.`);
  }

  const players = state.players.map((item) =>
    item.id === playerId ? { ...item, hand: item.hand.filter((itemCard) => itemCard.id !== cardId) } : item,
  );
  const trick = [...state.trick, { playerId, card }];
  const leadSuit = state.leadSuit ?? card.suit;

  if (trick.length < players.length) {
    const currentIndex = players.findIndex((item) => item.id === playerId);
    const nextPlayer = players[(currentIndex + 1) % players.length];
    return { ...state, players, trick, leadSuit, currentPlayerId: nextPlayer.id, winnerPlayerId: null };
  }

  const winner = getWinner(trick, leadSuit)!;
  const remainingCards = players.reduce((sum, item) => sum + item.hand.length, 0);
  const loser = remainingCards === 0 ? winner.playerId : null;
  const phase = loser ? 'finished' : 'playing';

  return {
    ...state,
    players,
    trick: [],
    leadSuit: null,
    currentPlayerId: winner.playerId,
    winnerPlayerId: winner.playerId,
    lastTrickWinnerId: winner.playerId,
    phase,
    loserPlayerId: loser,
  };
}

export function suitSymbol(suit: Suit): string {
  return { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }[suit];
}
