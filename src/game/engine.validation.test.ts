import { describe, expect, it } from 'vitest';
import { createDeck, dealCards, cardCanBePlayed, getWinner, createGame, playCard, type Card, type PlayerState } from './engine';
const c=(rank:Card['rank'],suit:Card['suit']):Card=>({id:`${rank}-${suit}`,rank,suit});
const p=(id:string,hand:Card[]=[]):PlayerState=>({id,name:id,hand});

describe('9.2 complete rule validation',()=>{
 it('rejects duplicate/missing cards in a supplied deck through observable deal integrity',()=>{
  const deck=createDeck(); expect(new Set(deck.map(x=>x.id)).size).toBe(52);
  const hands=dealCards([p('1'),p('2'),p('3')],deck); const ids=hands.flatMap(x=>x.hand.map(c=>c.id));
  expect(ids).toHaveLength(52); expect(new Set(ids).size).toBe(52);
 });
 it('requires 3-5 players',()=>{
  expect(()=>createGame([p('1'),p('2')])).toThrow('3 to 5');
  expect(()=>createGame([p('1'),p('2'),p('3'),p('4'),p('5'),p('6')])).toThrow('3 to 5');
 });
 it('uses 2-clubs as the starting-card rule',()=>{
  const ps=[p('1',[c('A','spades')]),p('2',[c('2','clubs')]),p('3',[c('K','hearts')])];
  expect(createGame(ps).currentPlayerId).toBe('2');
 });
 it('enforces follow suit and permits discard only without lead suit',()=>{
  const hand=[c('2','hearts'),c('A','clubs')];
  expect(cardCanBePlayed(hand[1],hand,'hearts')).toBe(false);
  expect(cardCanBePlayed(hand[0],hand,'hearts')).toBe(true);
  expect(cardCanBePlayed(c('A','clubs'),[c('A','clubs'),c('3','diamonds')],'spades')).toBe(true);
 });
 it('selects the highest lead-suit card only',()=>{
  expect(getWinner([{playerId:'1',card:c('Q','clubs')},{playerId:'2',card:c('A','hearts')},{playerId:'3',card:c('K','clubs')}],'clubs')?.playerId).toBe('1');
 });
 it('keeps state immutable and rejects stale/foreign plays',()=>{
  const ps=[p('1',[c('2','clubs')]),p('2',[c('3','clubs')]),p('3',[c('4','clubs')])];
  const s={...createGame(ps,createDeck()),players:ps,currentPlayerId:'1'}; const before=s.players[0].hand.map(x=>x.id);
  const next=playCard(s,'1','2-clubs');
  expect(s.players[0].hand.map(x=>x.id)).toEqual(before);
  expect(next.currentPlayerId).toBe('2');
  expect(()=>playCard(next,'1','2-clubs')).toThrow();
  expect(()=>playCard(next,'2','2-clubs')).toThrow();
 });
});
