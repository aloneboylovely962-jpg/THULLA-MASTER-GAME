import '../game/central-ui.css';

export type RemoteCard={id:string;rank:string;suit:string};
export type RemotePlayer={id:string;name:string;ready:boolean;connected:boolean;cardCount:number};
export type RemoteState={code:string;hostId:string;phase:'lobby'|'playing'|'finished';currentPlayerId:string|null;leadSuit:string|null;trick:{playerId:string;card:RemoteCard}[];winnerPlayerId:string|null;loserPlayerId:string|null;matchId:string|null;players:RemotePlayer[];you:string;hand:RemoteCard[]};
type Listener=(state:RemoteState)=>void;type ErrorListener=(message:string)=>void;
const storageKey='thulla-multiplayer-session';const authKey='thulla-auth-token';const apiUrl='/api/game';
const validRoomCode=(code:string)=>/^\d{6}$/.test(code);
export class MultiplayerClient{private listeners=new Set<Listener>();private errorListeners=new Set<ErrorListener>();private session:{code:string}|null=this.readSession();private pollTimer:ReturnType<typeof setTimeout>|null=null;private polling=false;private destroyed=false;private retryAttempt=0;private onlineHandler=()=>{this.retryAttempt=0;this.schedulePoll(0)};private offlineHandler=()=>this.stopPolling();
constructor(){window.addEventListener('online',this.onlineHandler);window.addEventListener('offline',this.offlineHandler)}
get authToken(){return localStorage.getItem(authKey)||'';}setAuthToken(token:string){localStorage.setItem(authKey,token);}clearAuthToken(){localStorage.removeItem(authKey);}async connect(){this.destroyed=false;this.retryAttempt=0;await this.pollNow();}
onState(listener:Listener){this.listeners.add(listener);return()=>this.listeners.delete(listener)}onError(listener:ErrorListener){this.errorListeners.add(listener);return()=>this.errorListeners.delete(listener)}
async createRoom(_name?:string){this.retryAttempt=0;await this.action('create_room')}async joinRoom(code:string,_name?:string){const normalized=code.trim();if(!validRoomCode(normalized))throw new Error('Enter a 6-digit room code.');this.retryAttempt=0;await this.action('join_room',{code:normalized})}async ready(){await this.action('ready')}async startGame(){await this.action('start_game')}async playCard(cardId:string){await this.action('play_card',{cardId})}
async leave(){const result=await this.action('leave');this.clearSession();return result}
destroy(){this.destroyed=true;this.stopPolling();window.removeEventListener('online',this.onlineHandler);window.removeEventListener('offline',this.offlineHandler)}
private readSession(){try{const value=JSON.parse(localStorage.getItem(storageKey)||'null');return value?.code&&validRoomCode(String(value.code))?{code:String(value.code)}:null}catch{return null}}
private clearSession(){this.session=null;localStorage.removeItem(storageKey)}private stopPolling(){if(this.pollTimer)clearTimeout(this.pollTimer);this.pollTimer=null;this.polling=false}
private schedulePoll(delay:number){if(this.destroyed||this.pollTimer||!navigator.onLine)return;this.pollTimer=setTimeout(()=>{this.pollTimer=null;void this.pollNow()},delay)}
private async action(action:string,extra:Record<string,unknown>={}){try{const r=await fetch(apiUrl,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${this.authToken}`},body:JSON.stringify({action,...extra,...(this.session?.code?{code:this.session.code}:{})})});const d=await r.json().catch(()=>({}));if(!r.ok){const message=String(d.error||'Game request failed.');if(action==='state'&&/room not found|room expired|session expired/i.test(message))this.clearSession();throw new Error(message)}if(d.state){if(!this.session)this.session={code:d.state.code};localStorage.setItem(storageKey,JSON.stringify(this.session));this.retryAttempt=0;this.listeners.forEach(l=>l(d.state))}return d}catch(e){this.errorListeners.forEach(l=>l(e instanceof Error?e.message:'Game request failed.'));throw e}}
private async pollNow(){if(this.destroyed||this.polling||!navigator.onLine)return;this.polling=true;try{if(this.session?.code)await this.action('state');this.retryAttempt=0}catch{this.retryAttempt=Math.min(this.retryAttempt+1,4)}finally{this.polling=false;if(!this.destroyed){const delay=this.session?.code?Math.min(8000,1200*2**Math.min(this.retryAttempt,3)):1200;this.schedulePoll(delay)}}}
}
export const multiplayerServerUrl=apiUrl;export const accountApiUrl='';export const authStorageKey=authKey;
