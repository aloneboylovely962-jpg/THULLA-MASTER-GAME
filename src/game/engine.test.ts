import { describe, expect, it } from 'vitest';
import { createDeck, shuffle, dealCards, cardCanBePlayed, getWinner, createGame, playCard, findStartingPlayer, type Card, type PlayerState } from './engine';
const card=(rank:Card['rank'],suit:Card['suit']):Card=>({id:`${rank}-${suit}`,rank,suit});
const player=(id:string,hand:Card[]=[]):PlayerState=>({id,name:id,hand});

describe('Thulla Master game rules',()=>{
 it('creates exactly 52 unique cards',()=>{const d=createDeck();expect(d).toHaveLength(52);expect(new Set(d.map(c=>c.id)).size).toBe(52);});
 it('shuffles without changing the card set',()=>{const d=createDeck();const s=shuffle(d,()=>.25);expect(s).toHaveLength(52);expect(new Set(s.map(c=>c.id))).toEqual(new Set(d.map(c=>c.id)));});
 it.each([3,4,5])('deals all 52 cards exactly once for %i players',count=>{const ps=Array.from({length:count},(_,i)=>player(String(i)));const hands=dealCards(ps,createDeck());const ids=hands.flatMap(p=>p.hand.map(c=>c.id));expect(ids).toHaveLength(52);expect(new Set(ids).size).toBe(52);});
 it('enforces follow-suit when possible',()=>{const h=[card('2','hearts'),card('A','clubs')];expect(cardCanBePlayed(h[1],h,'hearts')).toBe(false);expect(cardCanBePlayed(h[0],h,'hearts')).toBe(true);});
 it('allows off-suit only when no lead suit exists',()=>{const h=[card('A','clubs'),card('3','diamonds')];expect(cardCanBePlayed(h[0],h,'hearts')).toBe(true);});
 it('chooses highest card of lead suit',()=>{const t=[{playerId:'p1',card:card('A','hearts')},{playerId:'p2',card:card('K','hearts')},{playerId:'p3',card:card('A','spades')}];expect(getWinner(t,'hearts')?.playerId).toBe('p1');});
 it('never lets off-suit card win',()=>{const t=[{playerId:'p1',card:card('2','hearts')},{playerId:'p2',card:card('A','spades')},{playerId:'p3',card:card('K','hearts')}];expect(getWinner(t,'hearts')?.playerId).toBe('p3');});
 it('starts with the player holding Ace of Spades (Hukam)',()=>{const ps=[player('p1',[card('A','hearts')]),player('p2',[card('A','spades')]),player('p3',[card('K','spades')])];expect(findStartingPlayer(ps)).toBe('p2');});
 it('rejects games outside 3-5 players',()=>{expect(()=>createGame([player('1'),player('2')])).toThrow();expect(()=>createGame(Array.from({length:6},(_,i)=>player(String(i))))).toThrow();});
 it('rejects playing out of turn and invalid card ownership',()=>{const s=createGame([player('p1'),player('p2'),player('p3')],createDeck());expect(()=>playCard(s,'not-a-player','A-spades')).toThrow();const current=s.currentPlayerId;expect(()=>playCard(s,current,'not-a-card')).toThrow();});
 it('removes the opening Ace of Spades and advances turn',()=>{const ps=[player('p1',[card('A','spades')]),player('p2',[card('3','clubs')]),player('p3',[card('4','clubs')])];const s={...createGame(ps,createDeck()),currentPlayerId:'p1',players:ps};const next=playCard(s,'p1','A-spades');expect(next.players.find(p=>p.id==='p1')?.hand).toHaveLength(0);expect(next.currentPlayerId).toBe('p2');});
});
