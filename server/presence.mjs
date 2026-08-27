// Phase 11.3 global presence store.
// Presence is intentionally in-memory: a user is online only while an authenticated
// game WebSocket is alive. Database remains the source of truth for friendship.
const onlineUsers = new Map();

export function markOnline(userId) {
  if (!userId) return;
  onlineUsers.set(String(userId), Date.now());
}

export function markOffline(userId) {
  if (!userId) return;
  onlineUsers.delete(String(userId));
}

export function isOnline(userId) {
  return Boolean(userId && onlineUsers.has(String(userId)));
}

export function onlineIds(ids) {
  return ids.filter(id => isOnline(id));
}

export function prunePresence(maxAgeMs = 90_000) {
  const now = Date.now();
  for (const [id, seenAt] of onlineUsers) {
    if (now - seenAt > maxAgeMs) onlineUsers.delete(id);
  }
}
