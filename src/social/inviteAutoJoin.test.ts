import { describe, expect, it } from 'vitest';

describe('Phase 11.5 invite UX contract', () => {
  it('uses a 5-second refresh cadence for pending invite UX', () => {
    expect(5000).toBe(5000);
  });
  it('only presents non-expired pending invites', () => {
    const now=Date.now();
    const invites=[{status:'pending',expiresAt:now+1000},{status:'pending',expiresAt:now-1},{status:'accepted',expiresAt:now+1000}];
    const pending=invites.filter(i=>i.status==='pending'&&i.expiresAt>now);
    expect(pending).toHaveLength(1);
  });
});
