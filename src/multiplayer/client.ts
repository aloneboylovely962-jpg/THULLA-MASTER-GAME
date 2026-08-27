export type RemoteCard={id:string;rank:string;suit:string};
export type RemotePlayer={id:string;name:string;ready:boolean;connected:boolean;cardCount:number};
export type RemoteState={code:string;hostId:string;phase:'lobby'|'playing'|'finished';currentPlayerId:string|null;leadSuit:string|null;trick:{playerId:string;card:RemoteCard}[];winnerPlayerId:string|null;loserPlayerId:string|null;matchId:string|null;players:RemotePlayer[];you:string;hand:RemoteCard[]};
type Listener=(state:RemoteState)=>void;type ErrorListener=(message:string)=>void;
const storageKey='thulla-multiplayer-session';const authKey='thulla-auth-token';const apiUrl='/api/game';

export class MultiplayerClient{
 private listeners=new Set<Listener>();private errorListeners=new Set<ErrorListener>();private session:{code:string}|null=JSON.parse(localStorage.getItem(storageKey)||'null');private pollTimer:ReturnType<typeof setTimeout>|null=null;private polling=false;private destroyed=false;
 get authToken(){return localStorage.getItem(authKey)||'';}setAuthToken(token:string){localStorage.setItem(authKey,token);}clearAuthToken(){localStorage.removeItem(authKey);}
 async connect(){this.destroyed=false;await this.poll();}
 onState(listener:Listener){this.listeners.add(listener);return()=>this.listeners.delete(listener);}onError(listener:ErrorListener){this.errorListeners.add(listener);return()=>this.errorListeners.delete(listener);}
 async createRoom(){await this.action('create_room');}async joinRoom(code:string){await this.action('join_room',{code:code.trim()});}async ready(){await this.action('ready');}async startGame(){await this.action('start_game');}async playCard(cardId:string){await this.action('play_card',{cardId});}async leave(){const result=await this.action('leave');this.stopPolling();this.session=null;localStorage.removeItem(storageKey);return result;}
 destroy(){this.destroyed=true;this.stopPolling();}private stopPolling(){if(this.pollTimer)clearTimeout(this.pollTimer);this.pollTimer=null;this.polling=false;}
 private async action(action:string,extra:Record<string,unknown>={}){try{const r=await fetch(apiUrl,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${this.authToken}`},body:JSON.stringify({action,...extra,...(this.session?.code?{code:this.session.code}:{})})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Game request failed.');if(d.state){if(!this.session)this.session={code:d.state.code};localStorage.setItem(storageKey,JSON.stringify(this.session));this.listeners.forEach(l=>l(d.state));}return d;}catch(e){this.errorListeners.forEach(l=>l(e instanceof Error?e.message:'Game request failed.'));throw e;}}
 private async poll(){if(this.destroyed||this.polling)return;this.polling=true;try{if(this.session?.code){await this.action('state');}}catch{}finally{this.polling=false;if(!this.destroyed){this.pollTimer=setTimeout(()=>this.poll(),1200);}}}
}
export const multiplayerServerUrl=apiUrl;export const accountApiUrl=apiUrl;export const authStorageKey=authKey;
