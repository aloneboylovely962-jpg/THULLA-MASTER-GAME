export const accountApiUrl = import.meta.env.VITE_ACCOUNT_API_URL || '';
export const authStorageKey = 'thulla_auth_token';

async function api(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem(authStorageKey);
  const res = await fetch(`${accountApiUrl}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Room invite failed.');
  return data;
}

export type RoomInvite = {
  id: string;
  roomCode: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: number;
  expiresAt: number;
  sender?: { id: string; username: string; display_name: string };
};

export async function sendRoomInvite(roomCode: string, friendId: string) {
  return api(`/api/rooms/${encodeURIComponent(roomCode)}/invites`, { method: 'POST', body: JSON.stringify({ friendId }) });
}
export async function getRoomInvites(): Promise<RoomInvite[]> {
  const data = await api('/api/invites');
  return Array.isArray(data.invites) ? data.invites : [];
}
export async function respondRoomInvite(id: string, action: 'accept' | 'reject' | 'cancel') {
  return api(`/api/invites/${encodeURIComponent(id)}/${action}`, { method: 'POST', body: '{}' });
}

export function openInviteSocket(onInvite: (invite: RoomInvite) => void) {
  const token = localStorage.getItem(authStorageKey);
  if (!token || typeof WebSocket === 'undefined') return () => {};
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${protocol}//${window.location.host}`);
  socket.addEventListener('open', () => socket.send(JSON.stringify({ type: 'auth_presence', authToken: token })));
  socket.addEventListener('message', event => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'room_invite' && message.invite) onInvite(message.invite as RoomInvite);
    } catch {}
  });
  return () => socket.close();
}
