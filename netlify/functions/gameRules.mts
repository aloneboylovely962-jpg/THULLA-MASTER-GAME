import { createGame, playCard, type Card, type PlayerState, type GameState } from '../../src/game/engine';

/** Server adapter for the canonical shared game engine. */
export function toEnginePlayers(players: Array<{ id: string; name: string; hand: Card[] }>): PlayerState[] {
  return players.map(({ id, name, hand }) => ({ id, name, hand }));
}

export function createAuthoritativeGame(players: Array<{ id: string; name: string; hand: Card[] }>, deck?: Card[]): GameState {
  return createGame(toEnginePlayers(players), deck);
}

export function hydrateAuthoritativeGame(input: { players: Array<{ id: string; name: string; hand: Card[] }>; currentPlayerId: string; trick: GameState['trick']; leadSuit: GameState['leadSuit']; }): GameState {
  const players = toEnginePlayers(input.players);
  if (!players.some((player) => player.id === input.currentPlayerId)) throw new Error('Current player not found.');
  return { players, currentPlayerId: input.currentPlayerId, trick: [...input.trick], leadSuit: input.leadSuit, winnerPlayerId: null, lastTrickWinnerId: null, phase: 'playing', loserPlayerId: null };
}

export function applyAuthoritativeCard(state: GameState, playerId: string, cardId: string): GameState {
  return playCard(state, playerId, cardId);
}
