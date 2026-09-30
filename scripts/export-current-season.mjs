// Offline export: reads only approved identities and completed weekly game files.
// Example: node scripts/export-current-season.mjs --source ../../out/weekly/2026 --season 2026 --through-week 3 --confirmed-final
import { readFileSync, writeFileSync, renameSync, existsSync, unlinkSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import { validateSeason } from '../src/lib/currentSeason.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2), value=name=>args[args.indexOf(name)+1];
if(!args.includes('--source')||!args.includes('--season')||!args.includes('--through-week')||!args.includes('--confirmed-final')) throw Error('Provide --source, --season, --through-week and --confirmed-final after reviewing game finality.');
const season=Number(value('--season')),throughWeek=Number(value('--through-week'));
if(!Number.isInteger(season)||!Number.isInteger(throughWeek)||throughWeek<1)throw Error('Invalid season/week');
const csv=path=>{const result=Papa.parse(readFileSync(path,'utf8'),{header:true,skipEmptyLines:'greedy'});if(result.errors.length||!result.data.length)throw Error('Invalid CSV: '+path);return result.data;};
const current=csv(resolve(root,'public/data/current_teams.csv'));
if(current.some(t=>Number(t.season)!==season))throw Error('Current teams season mismatch');
const teams=current.map(t=>({id:t.team_id,name:t.team_name})),games=[];
const index=JSON.parse(readFileSync(resolve(root,'public/data/weekly/index.json'),'utf8'));
for(let week=1;week<=throughWeek;week++){
 if(!index.weeks.some(w=>w.year===season&&w.week===week))throw Error('Publish/review the corresponding newsletter before exporting this week');
 const source=resolve(value('--source'),'week_'+week);
 const identities=csv(resolve(source,'team_identities.csv'));
 const id=name=>{const matches=identities.filter(t=>t.team_name===name&&Number(t.season)===season);if(matches.length!==1)throw Error('Ambiguous or unknown team: '+name);return matches[0].team_id;};
 for(const g of csv(resolve(source,'games.csv'))){
  if(Number(g.season)!==season||Number(g.week)!==week||g.home_score.trim()===''||g.away_score.trim()==='')throw Error('Invalid game source');
  const a=id(g.home_team),b=id(g.away_team),as=Number(g.home_score),bs=Number(g.away_score);
  const winner=g.winner===g.home_team?a:g.winner===g.away_team?b:as===bs&&['tie',''].includes(g.winner.toLowerCase())?null:undefined;
  games.push({season,week,a,b,as,bs,winner});
 }
}
const snapshot=JSON.parse(readFileSync(resolve(value('--source'),'week_'+throughWeek,'espn_standings.json'),'utf8'));
// Explicit public allowlist; never spread raw input into the website export.
const espn=Object.fromEntries(['season','throughWeek','source','fetchedAt','playoffTeamCount','seedRule','regularSeasonWeeks','rounds','consolationEnabled','reseed'].map(k=>[k,snapshot[k]]));
espn.teams=snapshot.teams.map(t=>Object.fromEntries(['id','seed','divisionId','division','wins','losses','ties','pf','pa','pct','gamesBack','divisionRecord','homeRecord','awayRecord','streak','moves','playoffPct','clinch'].map(k=>[k,t[k]])));
espn.teams.forEach(t=>{t.streak={type:t.streak.type,length:t.streak.length};});
const data={season,throughWeek,teams,games,espn};validateSeason(data);
const output=resolve(root,'public/data/current_season.json');
const content=JSON.stringify(data,null,2)+'\n';
if(!existsSync(output)||readFileSync(output,'utf8')!==content) {
 const temporary=output+'.'+process.pid+'.tmp';
 try {
  writeFileSync(temporary,content);
  // OneDrive and Windows preview readers can briefly hold a file open.
  for(let attempt=0;;attempt++) {
   try {renameSync(temporary,output);break;}
   catch(error) {if(!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt===5)throw error;await delay(200*(attempt+1));}
  }
 } finally {if(existsSync(temporary))unlinkSync(temporary);}
}
console.log('Exported '+games.length+' completed games through Week '+throughWeek+'. No publication performed.');
