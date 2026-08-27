import { randomUUID } from 'node:crypto';

export const FRIEND_STATUS = Object.freeze({ PENDING: 'pending', ACCEPTED: 'accepted', REJECTED: 'rejected', CANCELLED: 'cancelled' });

export function normalizeFriendQuery(value) {
  return String(value ?? '').trim().slice(0, 64);
}

export async function ensureFriendsSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id UUID PRIMARY KEY,
      sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (sender_id <> recipient_id),
      CHECK (status IN ('pending','accepted','rejected','cancelled'))
    );
    CREATE INDEX IF NOT EXISTS friend_requests_recipient_idx ON friend_requests(recipient_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS friend_requests_sender_idx ON friend_requests(sender_id, status, created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_pending_pair_idx
      ON friend_requests (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id))
      WHERE status = 'pending';
  `);
}

export async function listFriendRequests(pool, userId) {
  const { rows } = await pool.query(`
    SELECT fr.id, fr.status, fr.created_at, fr.updated_at,
      sender.id AS sender_id, sender.username AS sender_username, sender.display_name AS sender_display_name,
      recipient.id AS recipient_id, recipient.username AS recipient_username, recipient.display_name AS recipient_display_name
    FROM friend_requests fr
    JOIN users sender ON sender.id = fr.sender_id
    JOIN users recipient ON recipient.id = fr.recipient_id
    WHERE (fr.sender_id=$1 OR fr.recipient_id=$1) AND fr.status='pending'
    ORDER BY fr.created_at DESC`, [userId]);
  return rows;
}

export async function createFriendRequest(pool, senderId, targetId) {
  if (senderId === targetId) throw Object.assign(new Error('You cannot add yourself.'), { status: 400 });
  const target = await pool.query('SELECT id,username,display_name,level,xp,wins,games_played FROM users WHERE id=$1 OR username=$2 LIMIT 1', [targetId, normalizeFriendQuery(targetId).toLowerCase()]);
  if (!target.rows[0]) throw Object.assign(new Error('Player not found.'), { status: 404 });
  const recipientId = target.rows[0].id;
  if (recipientId === senderId) throw Object.assign(new Error('You cannot add yourself.'), { status: 400 });
  const existing = await pool.query(`SELECT id,status,sender_id,recipient_id FROM friend_requests WHERE ((sender_id=$1 AND recipient_id=$2) OR (sender_id=$2 AND recipient_id=$1)) AND status IN ('pending','accepted') ORDER BY created_at DESC LIMIT 1`, [senderId, recipientId]);
  if (existing.rows[0]?.status === 'accepted') throw Object.assign(new Error('You are already friends.'), { status: 409 });
  if (existing.rows[0]?.status === 'pending') throw Object.assign(new Error('A friend request is already pending.'), { status: 409 });
  const id = randomUUID();
  await pool.query('INSERT INTO friend_requests(id,sender_id,recipient_id,status) VALUES($1,$2,$3,$4)', [id, senderId, recipientId, FRIEND_STATUS.PENDING]);
  return { id, status: FRIEND_STATUS.PENDING, player: target.rows[0] };
}

export async function transitionFriendRequest(pool, userId, requestId, action) {
  const allowed = new Set(['accept', 'reject', 'cancel']);
  if (!allowed.has(action)) throw Object.assign(new Error('Invalid request action.'), { status: 400 });
  const { rows } = await pool.query('SELECT id,sender_id,recipient_id,status FROM friend_requests WHERE id=$1 FOR UPDATE', [requestId]);
  if (!rows[0]) throw Object.assign(new Error('Friend request not found.'), { status: 404 });
  const request = rows[0];
  if (request.status !== FRIEND_STATUS.PENDING) throw Object.assign(new Error('Friend request is no longer pending.'), { status: 409 });
  if (action === 'cancel' && request.sender_id !== userId) throw Object.assign(new Error('Only the sender can cancel this request.'), { status: 403 });
  if (action !== 'cancel' && request.recipient_id !== userId) throw Object.assign(new Error('Only the recipient can respond to this request.'), { status: 403 });
  const next = action === 'accept' ? FRIEND_STATUS.ACCEPTED : action === 'reject' ? FRIEND_STATUS.REJECTED : FRIEND_STATUS.CANCELLED;
  await pool.query('UPDATE friend_requests SET status=$1,updated_at=NOW() WHERE id=$2 AND status=$3', [next, requestId, FRIEND_STATUS.PENDING]);
  return { id: requestId, status: next };
}
