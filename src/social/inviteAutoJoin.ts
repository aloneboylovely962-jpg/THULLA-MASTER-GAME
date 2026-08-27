import { getRoomInvites, respondRoomInvite, type RoomInvite } from './roomInvites';

const seen = new Set<string>();
const badgeId = 'thulla-invite-badge';

function token() { return localStorage.getItem('thulla_auth_token') || ''; }
function showBadge(count: number) {
  let el = document.getElementById(badgeId);
  if (!el) { el = document.createElement('span'); el.id = badgeId; el.setAttribute('aria-label','Unread room invites'); Object.assign(el.style,{position:'fixed',top:'14px',right:'14px',zIndex:'99998',minWidth:'24px',height:'24px',padding:'0 7px',borderRadius:'999px',background:'#e1b549',color:'#10251e',font:'700 13px/24px system-ui',textAlign:'center',boxShadow:'0 4px 16px rgba(0,0,0,.25)'}); document.body.appendChild(el); }
  el.textContent = String(count); el.style.display = count ? 'block' : 'none';
}
function roomInput() { return document.querySelector<HTMLInputElement>('input[placeholder="123456"]'); }
function acceptAndJoin(invite: RoomInvite) {
  return respondRoomInvite(invite.id,'accept').then(result => {
    const code = result.roomCode || invite.roomCode;
    const input = roomInput();
    if (input) { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set; setter?.call(input,code); input.dispatchEvent(new Event('input',{bubbles:true})); const join = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.trim()==='Join Room'); join?.click(); }
    return code;
  });
}
function notify(invite: RoomInvite) {
  if (seen.has(invite.id)) return; seen.add(invite.id);
  const root=document.createElement('div'); Object.assign(root.style,{position:'fixed',left:'50%',top:'18%',transform:'translateX(-50%)',zIndex:'100000',width:'min(420px,calc(100vw - 28px))',padding:'18px',borderRadius:'16px',background:'#10251e',color:'#fff',boxShadow:'0 18px 60px rgba(0,0,0,.45)',border:'1px solid rgba(225,181,73,.55)',fontFamily:'system-ui'});
  const title=document.createElement('strong'); title.textContent='🎮 Room Invite'; title.style.fontSize='18px';
  const text=document.createElement('p'); text.textContent=`${invite.sender?.display_name||'Friend'} invited you to Room ${invite.roomCode}.`; text.style.margin='10px 0';
  const actions=document.createElement('div'); actions.style.display='flex'; actions.style.gap='8px';
  const accept=document.createElement('button'); accept.textContent='Accept & Join'; Object.assign(accept.style,{padding:'9px 12px',border:0,borderRadius:'9px',background:'#e1b549',color:'#10251e',fontWeight:'700'});
  const reject=document.createElement('button'); reject.textContent='Reject'; Object.assign(reject.style,{padding:'9px 12px',border:0,borderRadius:'9px',background:'#293832',color:'#fff'});
  accept.onclick=async()=>{accept.disabled=true;try{await acceptAndJoin(invite);root.remove();}catch(e){accept.disabled=false;text.textContent=e instanceof Error?e.message:'Unable to join room.';}};
  reject.onclick=async()=>{reject.disabled=true;try{await respondRoomInvite(invite.id,'reject');root.remove();}catch(e){reject.disabled=false;text.textContent=e instanceof Error?e.message:'Unable to reject invite.';}};
  actions.append(accept,reject);root.append(title,text,actions);document.body.appendChild(root);
}
export async function refreshInviteUx() {
  if (!token()) return;
  try { const invites=await getRoomInvites(); const pending=invites.filter(i=>i.status==='pending'&&i.expiresAt>Date.now()); showBadge(pending.length); pending.forEach(notify); } catch {}
}
if (typeof window!=='undefined') { window.addEventListener('load',()=>{refreshInviteUx();window.setInterval(refreshInviteUx,5000);}); }
