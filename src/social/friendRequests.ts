export const accountApiUrl = import.meta.env.VITE_ACCOUNT_API_URL || '';
export const authStorageKey = 'thulla_auth_token';

async function request(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem(authStorageKey);
  const response = await fetch(`${accountApiUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Friend request failed.');
  return data;
}

export type FriendRequest = {
  id: string;
  status: 'pending';
  created_at: string;
  sender_id: string;
  sender_username: string;
  sender_display_name: string;
  recipient_id: string;
  recipient_username: string;
  recipient_display_name: string;
};

export type Friend = {
  id: string;
  username: string;
  display_name: string;
  level: number;
  xp: number;
  wins: number;
  losses?: number;
  games_played: number;
  online: boolean;
};

export async function getFriends(): Promise<Friend[]> {
  const data = await request('/api/friends');
  return Array.isArray(data.friends) ? data.friends : [];
}

export async function getFriendRequests() {
  const data = await request('/api/friends/requests');
  return { incoming: data.incoming || [], outgoing: data.outgoing || [] } as { incoming: FriendRequest[]; outgoing: FriendRequest[] };
}

export async function sendFriendRequest(query: string) {
  return request('/api/friends/requests', { method: 'POST', body: JSON.stringify({ playerId: query.trim() }) });
}

export async function respondFriendRequest(id: string, action: 'accept' | 'reject' | 'cancel') {
  return request(`/api/friends/requests/${encodeURIComponent(id)}/${action}`, { method: 'POST', body: '{}' });
}
