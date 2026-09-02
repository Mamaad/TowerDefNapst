const CUES={
 artifact:{gap:.18,notes:[660,990],noise:3200},bounty:{gap:.16,notes:[520,780],noise:2500},commander:{gap:.35,notes:[170,255],noise:900},saboteur:{gap:.28,notes:[310,205],noise:1800},'map-event':{gap:.3,notes:[430,645],noise:1400},'weak-point':{gap:.18,notes:[880,1320],noise:4200},'boss-map':{gap:.45,notes:[120,180],noise:720},'boss-adapt':{gap:.45,notes:[146,219],noise:1100},veterancy:{gap:.3,notes:[610,915],noise:2900},legendary:{gap:.5,notes:[220,440,660],noise:1800},'enemy-projectile':{gap:.12,notes:[260],noise:1500},intercept:{gap:.08,notes:[980],noise:4800},objective:{gap:.18,notes:[700,1050],noise:3600},'nexus-ability':{gap:.55,notes:[140,280,560],noise:1200},'wave-choice':{gap:.25,notes:[390,585],noise:2100},'perfect-wave':{gap:.3,notes:[740,1110],noise:3900}
};
export function installWorldStrategyAudio(audio){
 if(!audio||audio.playWorldCue)return audio;
 audio.playWorldCue=function(name){
   this.ensure?.();if(!this.ctx||this.ctx.state!=='running')return;
   const cue=CUES[name]||CUES['map-event'];if(!this.canPlay?.(`world-${name}`,cue.gap))return;
   const now=this.ctx.currentTime;
   cue.notes.forEach((note,i)=>{if(this.pluck)this.pluck(note,now+i*.045,.14+i*.02,.025,.92,this.sfxGain);else if(this.horn)this.horn(note,now+i*.05,.18,.018);});
   this.noiseTap?.(now,.07,.018,cue.noise,'bandpass',this.sfxGain,1.05);
   if(['commander','boss-map','boss-adapt','nexus-ability'].includes(name))this.tom?.(now+.02,110,.025);
 };
 return audio;
}
