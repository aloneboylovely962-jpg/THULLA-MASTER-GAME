import { getRoomInvites, openInviteSocket, respondRoomInvite, sendRoomInvite, type RoomInvite } from './roomInvites';

const styleId = 'thulla-invite-enhancer-style';
function roomCode() {
  const value = document.querySelector('.room-pill strong')?.textContent?.replace(/\D/g, '') || '';
  return /^\d{6}$/.test(value) ? value : '';
}
function toast(message: string, action?: { label: string; run: () => void }) {
  let root = document.querySelector<HTMLElement>('#thulla-social-toast');
  if (!root) { root = document.createElement('div'); root.id = 'thulla-social-toast'; Object.assign(root.style, { position: 'fixed', right: '16px', bottom: '18px', zIndex: '99999', maxWidth: 'min(360px, calc(100vw - 32px))' }); document.body.appendChild(root); }
  const card = document.createElement('div'); Object.assign(card.style, { marginTop: '8px', padding: '12px 14px', borderRadius: '12px', background: '#10251e', color: '#fff', boxShadow: '0 8px 28px rgba(0,0,0,.35)', border: '1px solid rgba(225,181,73,.45)' });
  card.textContent = message;
  if (action) { const button = document.createElement('button'); button.textContent = action.label; button.style.marginLeft = '10px'; button.onclick = () => { action.run(); card.remove(); }; card.appendChild(button); }
  root.appendChild(card); window.setTimeout(() => card.remove(), 6000);
}
function installStyle() {
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style'); style.id = styleId; style.textContent = '.thulla-invite-btn{margin-left:auto;min-width:78px}.thulla-invite-btn:disabled{opacity:.55;cursor:not-allowed}'; document.head.appendChild(style);
}
async function renderInviteButtons() {
  const list = document.querySelector<HTMLElement>('.friends-list'); if (!list) return;
  installStyle();
  const code = roomCode();
  const rows = Array.from(list.querySelectorAll<HTMLElement>('.room-player'));
  let friends: Array<{ id: string; display_name: string; username: string }> = [];
  try { const token = localStorage.getItem('thulla_auth_token'); const r = await fetch('/api/friends', { headers: token ? { authorization: `Bearer ${token}` } : {} }); const d = await r.json(); friends = Array.isArray(d.friends) ? d.friends : []; } catch { return; }
  rows.forEach(row => {
    if (row.querySelector('.thulla-invite-btn')) return;
    const name = row.querySelector('strong')?.textContent?.trim() || '';
    const friend = friends.find(f => f.display_name === name);
    if (!friend) return;
    const button = document.createElement('button'); button.className = 'primary thulla-invite-btn'; button.textContent = code ? 'Invite' : 'Join room first'; button.disabled = !code;
    button.onclick = async () => { button.disabled = true; button.textContent = 'Sending…'; try { await sendRoomInvite(code, friend.id); button.textContent = 'Invited'; toast(`Invite sent to @${friend.username}`); } catch (e) { button.disabled = false; button.textContent = code ? 'Invite' : 'Join room first'; toast(e instanceof Error ? e.message : 'Invite failed.'); } };
    row.appendChild(button);
  });
}
function inviteReceived(invite: RoomInvite) {
  toast(`${invite.sender?.display_name || 'Friend'} invited you to room ${invite.roomCode}.`, { label: 'Accept', run: async () => { try { const result = await respondRoomInvite(invite.id, 'accept'); const input = document.querySelector<HTMLInputElement>('input[placeholder="123456"]'); if (input) { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set; setter?.call(input, result.roomCode); input.dispatchEvent(new Event('input', { bubbles: true })); } toast(`Invite accepted. Room ${result.roomCode} ready to join.`); } catch (e) { toast(e instanceof Error ? e.message : 'Unable to accept invite.'); } }});
}
let stopSocket: (() => void) | null = null;
function boot() {
  if (stopSocket) stopSocket();
  stopSocket = openInviteSocket(inviteReceived);
  getRoomInvites().then(invites => invites.forEach(inviteReceived)).catch(() => {});
  renderInviteButtons();
}
if (typeof window !== 'undefined') {
  const observer = new MutationObserver(() => { void renderInviteButtons(); });
  window.addEventListener('load', boot);
  window.setTimeout(boot, 700);
  observer.observe(document.body, { childList: true, subtree: true });
}
