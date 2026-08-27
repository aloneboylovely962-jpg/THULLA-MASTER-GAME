import { describe, expect, it } from 'vitest';
import { createDeck, createGame, dealCards, shuffle, type PlayerState } from './engine';

const players = (count: number): PlayerState[] =>
  Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: `P${i}`, hand: [] }));

describe('Thulla Master performance smoke tests', () => {
  it('handles 10,000 deck/shuffle operations without changing card integrity', () => {
    const start = performance.now();
    for (let i = 0; i < 10_000; i += 1) {
      const shuffled = shuffle(createDeck());
      expect(shuffled).toHaveLength(52);
      if (i % 1000 === 0) expect(new Set(shuffled.map((c) => c.id)).size).toBe(52);
    }
    expect(performance.now() - start).toBeLessThan(10_000);
  }, 15_000);

  it.each([3, 4, 5])('handles 2,000 %i-player deal operations', (count) => {
    const start = performance.now();
    for (let i = 0; i < 2_000; i += 1) {
      const dealt = dealCards(players(count), createDeck());
      expect(dealt.reduce((sum, p) => sum + p.hand.length, 0)).toBe(52);
    }
    expect(performance.now() - start).toBeLessThan(5_000);
  }, 7_500);

  it('creates 5,000 game states without leaking card references between games', () => {
    const start = performance.now();
    let previousHandId: string | undefined;
    for (let i = 0; i < 5_000; i += 1) {
      const game = createGame(players(4));
      const firstCard = game.players[0].hand[0]?.id;
      expect(firstCard).toBeDefined();
      if (previousHandId) expect(game.players[0].hand).not.toBeUndefined();
      previousHandId = firstCard;
    }
    expect(performance.now() - start).toBeLessThan(10_000);
  }, 12_500);
});
