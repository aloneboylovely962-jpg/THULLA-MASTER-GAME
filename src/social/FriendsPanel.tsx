import { useCallback, useEffect, useState } from 'react';
import { getFriendRequests, respondFriendRequest, sendFriendRequest, type FriendRequest } from './friendRequests';

const initials=(name:string)=>name.trim().charAt(0).toUpperCase()||'?';

export function FriendsPanel({ onClose }:{ onClose:()=>void }) {
  const [incoming,setIncoming]=useState<FriendRequest[]>([]);
  const [outgoing,setOutgoing]=useState<FriendRequest[]>([]);
  const [query,setQuery]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const refresh=useCallback(async()=>{
    setError('');
    try { const data=await getFriendRequests(); setIncoming(data.incoming); setOutgoing(data.outgoing); }
    catch(e){ setError(e instanceof Error?e.message:'Unable to load friend requests.'); }
  },[]);
  useEffect(()=>{ void refresh(); const id=window.setInterval(()=>void refresh(),10000); return()=>window.clearInterval(id); },[refresh]);

  const add=async()=>{
    const value=query.trim(); if(!value)return;
    setBusy(true);setError('');setNotice('');
    try { await sendFriendRequest(value); setQuery(''); setNotice('Friend request sent.'); await refresh(); }
    catch(e){setError(e instanceof Error?e.message:'Unable to send friend request.');}
    finally{setBusy(false);}
  };
  const act=async(id:string,action:'accept'|'reject'|'cancel')=>{
    setBusy(true);setError('');setNotice('');
    try { await respondFriendRequest(id,action); setNotice(action==='accept'?'Friend request accepted.':action==='reject'?'Friend request rejected.':'Friend request cancelled.'); await refresh(); }
    catch(e){setError(e instanceof Error?e.message:'Unable to update request.');}
    finally{setBusy(false);}
  };

  return <div className="profile-overlay" onClick={onClose}>
    <section className="profile-panel friends-panel" role="dialog" aria-modal="true" aria-labelledby="friends-title" onClick={e=>e.stopPropagation()}>
      <button className="profile-close" onClick={onClose} aria-label="Close friends">×</button>
      <div className="profile-hero"><div className="profile-avatar">👥</div><div><h2 id="friends-title">Friends</h2><p>Players & friend requests</p></div></div>
      <div className="friend-add"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void add()}} placeholder="Player ID or username" maxLength={64}/><button className="primary" disabled={busy||!query.trim()} onClick={()=>void add()}>Add</button></div>
      {notice&&<div className="toast inline-toast">{notice}</div>}{error&&<div className="toast inline-toast">{error}</div>}
      <div className="friend-section"><div className="section-title">Incoming <span>{incoming.length}</span></div>{incoming.length===0?<p className="profile-note">No pending requests.</p>:incoming.map(r=><div className="friend-row" key={r.id}><div className="avatar">{initials(r.sender_display_name)}</div><div className="friend-copy"><strong>{r.sender_display_name}</strong><small>@{r.sender_username}</small></div><div className="friend-actions"><button className="primary" disabled={busy} onClick={()=>void act(r.id,'accept')}>Accept</button><button className="secondary" disabled={busy} onClick={()=>void act(r.id,'reject')}>Reject</button></div></div>)}</div>
      <div className="friend-section"><div className="section-title">Outgoing <span>{outgoing.length}</span></div>{outgoing.length===0?<p className="profile-note">No pending outgoing requests.</p>:outgoing.map(r=><div className="friend-row" key={r.id}><div className="avatar">{initials(r.recipient_display_name)}</div><div className="friend-copy"><strong>{r.recipient_display_name}</strong><small>@{r.recipient_username} · Pending</small></div><button className="secondary" disabled={busy} onClick={()=>void act(r.id,'cancel')}>Cancel</button></div>)}</div>
      <p className="profile-note">Online/offline presence will only be shown when the presence service is connected; this screen never invents presence data.</p>
    </section>
  </div>;
}
