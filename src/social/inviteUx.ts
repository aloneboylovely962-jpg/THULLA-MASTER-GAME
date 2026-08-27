export type RoomInvite = { id:string; roomCode:string; inviterId:string; inviterUsername:string; inviterDisplayName:string; playerCount:number; expiresAt:string; };
export function inviteLabel(invite:RoomInvite){return `${invite.inviterDisplayName} invited you to Room ${invite.roomCode}`;}
export function isExpired(invite:RoomInvite){return Date.parse(invite.expiresAt)<=Date.now();}
export function unreadInviteCount(invites:RoomInvite[]){return invites.filter(i=>!isExpired(i)).length;}
