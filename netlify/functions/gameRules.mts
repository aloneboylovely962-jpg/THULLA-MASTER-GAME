import { createGame, playCard, type Card, type PlayerState, type GameState } from '../../src/game/engine';

/** Server adapter for the canonical shared game engine. */
export function toEnginePlayers(players: Array<{ id: string; name: string; hand: Card[] }>): PlayerState[] {
  return players.map(({ id, name, hand }) => ({ id, name, hand }));
}

export function createAuthoritativeGame(players: Array<{ id: string; name: string; hand: Card[] }>, deck?: Card[]): GameState {
  return createGame(toEnginePlayers(players), deck);
}

export function applyAuthoritativeCard(state: GameState, playerId: string, cardId: string): GameState {
  return playCard(state, playerId, cardId);
}
