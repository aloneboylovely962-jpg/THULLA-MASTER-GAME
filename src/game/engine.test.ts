import { describe, expect, it } from 'vitest';
import { createDeck, deal, canPlayCard, playCard, getTrickWinner, finishGame, type Card, type Player } from './engine';

const card=(rank:string,suit:Card['suit']):Card=>({id:`${rank}-${suit}`,rank,suit});
const player=(id:string,hand:Card[]):Player=>({id,name:id,hand,ready:true,connected:true});

describe('Thulla Master game rules',()=>{
  it('creates a complete unique 52-card deck',()=>{
    const d=createDeck();
    expect(d).toHaveLength(52);
    expect(new Set(d.map(c=>c.id)).size).toBe(52);
  });
  it('deals every card exactly once for 3, 4 and 5 players',()=>{
    for(const count of [3,4,5]){
      const players=Array.from({length:count},(_,i)=>player(String(i),[]));
      const hands=deal(players,createDeck());
      const ids=hands.flatMap(h=>h.map(c=>c.id));
      expect(ids).toHaveLength(52);
      expect(new Set(ids).size).toBe(52);
    }
  });
  it('requires following the lead suit when possible',()=>{
    const hand=[card('2','hearts'),card('A','clubs')];
    expect(canPlayCard(hand,card('A','spades'),'hearts')).toBe(false);
    expect(canPlayCard(hand,card('2','hearts'),'hearts')).toBe(true);
  });
  it('allows another suit when the player has no lead-suit card',()=>{
    const hand=[card('A','clubs'),card('3','diamonds')];
    expect(canPlayCard(hand,card('A','clubs'),'hearts')).toBe(true);
  });
  it('plays only a card owned by the player and removes it',()=>{
    const p=player('p1',[card('A','spades'),card('2','clubs')]);
    const result=playCard(p,card('A','spades'),null);
    expect(result.card.id).toBe('A-spades');
    expect(p.hand).toHaveLength(1);
    expect(p.hand[0].id).toBe('2-clubs');
  });
  it('rejects an illegal off-suit play',()=>{
    const p=player('p1',[card('A','spades'),card('2','clubs')]);
    expect(()=>playCard(p,card('2','clubs'),'spades')).toThrow();
  });
  it('selects the highest card of the lead suit',()=>{
    const trick=[
      {playerId:'p1',card:card('A','hearts')},
      {playerId:'p2',card:card('K','hearts')},
      {playerId:'p3',card:card('2','spades')},
    ];
    expect(getTrickWinner(trick,'hearts')).toBe('p1');
  });
  it('does not let an off-suit card win a trick',()=>{
    const trick=[
      {playerId:'p1',card:card('2','hearts')},
      {playerId:'p2',card:card('A','spades')},
      {playerId:'p3',card:card('K','hearts')},
    ];
    expect(getTrickWinner(trick,'hearts')).toBe('p3');
  });
  it('identifies the final-trick loser as Bhabhi',()=>{
    const result=finishGame([{id:'p1',cardsLeft:0},{id:'p2',cardsLeft:0},{id:'p3',cardsLeft:0}], 'p2');
    expect(result.loserPlayerId).toBe('p2');
    expect(result.phase).toBe('finished');
  });
});
