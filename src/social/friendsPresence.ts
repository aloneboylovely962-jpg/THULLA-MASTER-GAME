export const accountApiUrl = import.meta.env.VITE_ACCOUNT_API_URL || '';
export const authStorageKey = 'thulla_auth_token';

export type Friend = {
  id: string;
  username: string;
  display_name: string;
  level: number;
  xp: number;
  wins: number;
  games_played: number;
  online: boolean;
};

async function api(path: string) {
  const token = localStorage.getItem(authStorageKey);
  const res = await fetch(`${accountApiUrl}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Unable to load friends.');
  return data;
}

export async function getFriends(): Promise<Friend[]> {
  const data = await api('/api/friends');
  return Array.isArray(data.friends) ? data.friends : [];
}

export async function getFriendPresence(): Promise<Record<string, boolean>> {
  const data = await api('/api/friends/presence');
  return data.presence || {};
}

export function subscribeFriendPresence(onChange: () => void, intervalMs = 5000) {
  const timer = window.setInterval(onChange, intervalMs);
  return () => window.clearInterval(timer);
}
