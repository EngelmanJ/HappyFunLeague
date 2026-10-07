import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { validateSeason, seasonStats } from '../src/lib/currentSeason';
const fixture=()=>JSON.parse(readFileSync('tests/fixtures/current-season-week3.json','utf8'));
it('reconciles current records, scoring and all completed weeks',()=>{
 const data=validateSeason(fixture()),{standings,trend}=seasonStats(data);
 expect(data.games).toHaveLength(18);
 expect(standings.filter(t=>t.wins===2&&t.losses===1)).toHaveLength(8);
 expect(standings.find(t=>t.id==='1')).toMatchObject({pf:342,pa:242,wins:2,losses:1,rank:1});
 expect(standings.reduce((n,t)=>n+t.pf,0)).toBe(standings.reduce((n,t)=>n+t.pa,0));
 expect(Object.entries(trend[2]).filter(([k])=>k!=='week').reduce((n,[,v])=>n+v,0)).toBe(1046);
});
it('rejects partial weeks, duplicate games, unknown teams and contradictory winners',()=>{
 for(const mutate of [d=>d.games.pop(),d=>d.games.push(d.games[0]),d=>d.games[0].a='unknown',d=>d.games[0].winner=d.games[0].b,d=>d.games[0].as=null]){
  const d=fixture();mutate(d);expect(()=>validateSeason(d)).toThrow();
 }
});
it('supports score ties and recorded tiebreak winners without dropping zero scores',()=>{
 const raw={season:2026,throughWeek:1,teams:[{id:'a',name:'A'},{id:'b',name:'B'}],games:[{season:2026,week:1,a:'a',b:'b',as:0,bs:0,winner:null}]};
 expect(seasonStats(validateSeason(raw)).standings.map(t=>[t.ties,t.rank])).toEqual([[1,1],[1,1]]);
 raw.games[0].winner='b';expect(seasonStats(validateSeason(raw)).standings[0]).toMatchObject({id:'b',wins:1});
});
it('uses ESPN seeding and distinguishes unavailable probabilities from zero',()=>{
 const data=fixture();
 expect(seasonStats(validateSeason(data)).standings.map(t=>t.id)).toEqual(['1','11','8','9','10','6','5','2','4','7','12','3']);
 data.espn.teams[0].playoffPct=null;
 expect(seasonStats(validateSeason(data)).standings[0].playoffPct).toBeNull();
 data.espn.teams[0].playoffPct=0;
 expect(seasonStats(validateSeason(data)).standings[0].playoffPct).toBe(0);
});
it('rejects a mismatched ESPN week, seeds and totals',()=>{
 for(const mutate of [d=>d.espn.throughWeek++,d=>d.espn.teams[0].seed=2,d=>d.espn.teams[0].pf++,d=>d.espn.teams[0].playoffPct=2]) {
  const data=fixture();mutate(data);expect(()=>validateSeason(data)).toThrow();
 }
});
