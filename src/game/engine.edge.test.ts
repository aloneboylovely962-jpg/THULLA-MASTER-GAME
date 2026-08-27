import { describe, expect, it } from 'vitest';
import { createGame, playCard, type Card, type PlayerState } from './engine';
const c=(rank:Card['rank'],suit:Card['suit']):Card=>({id:`${rank}-${suit}`,rank,suit});
const p=(id:string,hand:Card[]=[]):PlayerState=>({id,name:id,hand});

describe('edge cases: turns, reconnect-safe state transitions',()=>{
 it('rejects a second play from the previous player after turn advances',()=>{
  const ps=[p('p1',[c('A','spades')]),p('p2',[c('3','clubs')]),p('p3',[c('4','clubs')])];
  const s={...createGame(ps,Array.from({length:52},(_,i)=>({id:`x${i}`,rank:'2',suit:'clubs'} as Card))),players:ps,currentPlayerId:'p1'};
  const next=playCard(s,'p1','A-spades');
  expect(next.currentPlayerId).toBe('p2');
  expect(()=>playCard(next,'p1','A-spades')).toThrow();
 });
 it('does not mutate the original state when a card is played',()=>{
  const ps=[p('p1',[c('A','spades')]),p('p2',[c('3','clubs')]),p('p3',[c('4','clubs')])];
  const s={...createGame(ps,Array.from({length:52},(_,i)=>({id:`x${i}`,rank:'2',suit:'clubs'} as Card))),players:ps,currentPlayerId:'p1'};
  const before=s.players[0].hand.map(x=>x.id);
  const next=playCard(s,'p1','A-spades');
  expect(s.players[0].hand.map(x=>x.id)).toEqual(before);
  expect(next.players[0].hand.map(x=>x.id)).not.toContain('A-spades');
 });
 it('rejects unknown players',()=>{
  const s=createGame([p('p1'),p('p2'),p('p3')]);
  expect(()=>playCard(s,'missing','A-spades')).toThrow();
 });
});
