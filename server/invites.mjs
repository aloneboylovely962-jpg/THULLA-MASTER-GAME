import { randomUUID } from 'node:crypto';

// Phase 11.4 room-invite helpers.
// Invitations are short-lived and only target accepted friends. Room membership
// remains authoritative in the multiplayer room map; this module only models invites.
const invites = new Map();
const INVITE_TTL_MS = 2 * 60_000;

export function createInvite({ senderId, recipientId, roomCode }) {
  const id = randomUUID();
  const now = Date.now();
  const invite = { id, senderId, recipientId, roomCode: String(roomCode), status: 'pending', createdAt: now, expiresAt: now + INVITE_TTL_MS };
  invites.set(id, invite);
  return invite;
}

export function getInvite(id) {
  const invite = invites.get(id);
  if (!invite) return null;
  if (Date.now() >= invite.expiresAt) { invites.delete(id); return null; }
  return invite;
}

export function respondInvite(id, recipientId, action) {
  const invite = getInvite(id);
  if (!invite) throw new Error('Room invite expired or not found.');
  if (invite.recipientId !== recipientId) throw new Error('You cannot respond to this invite.');
  if (invite.status !== 'pending') throw new Error('Invite is no longer pending.');
  if (!['accept', 'reject'].includes(action)) throw new Error('Invalid invite action.');
  invite.status = action === 'accept' ? 'accepted' : 'rejected';
  invite.updatedAt = Date.now();
  return invite;
}

export function cancelInvite(id, senderId) {
  const invite = getInvite(id);
  if (!invite) throw new Error('Room invite expired or not found.');
  if (invite.senderId !== senderId) throw new Error('Only the sender can cancel this invite.');
  if (invite.status !== 'pending') throw new Error('Invite is no longer pending.');
  invite.status = 'cancelled';
  invite.updatedAt = Date.now();
  return invite;
}

export function listPendingInvites(recipientId) {
  const result = [];
  for (const [id, invite] of invites) {
    if (Date.now() >= invite.expiresAt) { invites.delete(id); continue; }
    if (invite.recipientId === recipientId && invite.status === 'pending') result.push(invite);
  }
  return result;
}
