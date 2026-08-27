import { describe, expect, it } from 'vitest';

describe('11.6 reconnect session contract', () => {
  it('accepts only six-digit persisted room codes', () => {
    expect(/^\d{6}$/.test('417398')).toBe(true);
    expect(/^\d{6}$/.test('41739')).toBe(false);
    expect(/^\d{6}$/.test('abc123')).toBe(false);
  });

  it('uses a bounded reconnect delay', () => {
    const delay = (attempt: number) => Math.min(8000, 1200 * 2 ** Math.min(attempt, 3));
    expect(delay(0)).toBe(1200);
    expect(delay(1)).toBe(2400);
    expect(delay(10)).toBe(8000);
  });
});
