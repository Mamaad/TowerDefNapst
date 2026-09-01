import { ELEMENTS } from '../config/elements.js';
export class ParticleSystem{
 constructor(){this.items=[];this.pool=[];this.beams=[];this.rings=[];this.texts=[];this.maxParticles=760;}
 acquire(){return this.pool.pop()||{};}
 spawn(x,y,{color='#fff',count=1,power=50,type='orb',r=2,life=.5,gravity=0,drag=.95,glow=0,upBias=0}={}){for(let i=0;i<count;i++){const p=this.acquire(),a=Math.random()*Math.PI*2,s=power*(.28+Math.random()*.85);p.x=x;p.y=y;p.vx=Math.cos(a)*s;p.vy=Math.sin(a)*s-upBias;p.r=r*(.65+Math.random()*.8);p.life=life*(.68+Math.random()*.55);p.max=p.life;p.color=color;p.type=type;p.gravity=gravity;p.drag=drag;p.glow=glow;p.rot=Math.random()*Math.PI*2;p.spin=(Math.random()-.5)*6;this.items.push(p);}if(this.items.length>this.maxParticles){const excess=this.items.length-this.maxParticles;for(let i=0;i<excess;i++)this.pool.push(this.items.shift());}}
 burst(x,y,color,count=8,power=55){this.spawn(x,y,{color,count,power,glow:6,r:2.2,life:.48});}
 muzzle(tower,target){const el=ELEMENTS[tower.def.element],a=Math.atan2(target.y-tower.y,target.x-tower.x),x=tower.x+Math.cos(a)*22,y=tower.y-22+Math.sin(a)*12;const type=tower.def.element==='earth'?'dust':tower.def.element==='nature'?'leaf':tower.def.element==='ice'?'shard':'spark';this.spawn(x,y,{color:el.light,count:tower.level+2,power:36,type,r:2.3,life:.24,glow:8,upBias:3});}
 impact(element,x,y,kind='orb',heavy=false){const el=ELEMENTS[element];if(element==='fire'){this.spawn(x,y,{color:'#ff7a38',count:heavy?18:9,power:heavy?105:65,type:'spark',r:2.6,life:.42,glow:8});this.spawn(x,y,{color:'#55433ccc',count:heavy?7:3,power:28,type:'smoke',r:5,life:.7,gravity:-9,drag:.97,upBias:15});}
  else if(element==='ice'){this.spawn(x,y,{color:el.light,count:heavy?16:8,power:heavy?95:58,type:'shard',r:3,life:.5,gravity:18,glow:6});}
  else if(element==='lightning'){this.spawn(x,y,{color:el.light,count:heavy?16:7,power:95,type:'spark',r:2.4,life:.22,glow:12});}
  else if(element==='nature'){this.spawn(x,y,{color:el.color,count:heavy?14:8,power:64,type:'leaf',r:3,life:.52,gravity:10});}
  else if(element==='earth'){this.spawn(x,y,{color:'#b78c5d',count:heavy?18:10,power:80,type:'dust',r:3.5,life:.55,gravity:26});}
  else this.spawn(x,y,{color:el.light,count:heavy?18:9,power:75,type:'orb',r:2.7,life:.46,glow:11});
  this.ring(x,y,el.color,4,heavy?55:32,heavy?2.8:1.8,.3,element==='earth'?.48:1);
 }
 build(x,y,element){const el=ELEMENTS[element];this.ring(x,y,el.color,8,48,2.5,.5,.5);this.spawn(x,y,{color:el.light,count:16,power:62,type:'spark',r:2.4,life:.6,glow:8,upBias:32});}
 upgrade(x,y,element){const el=ELEMENTS[element];this.ring(x,y,el.light,10,72,4,.7,.5);this.spawn(x,y,{color:el.light,count:28,power:82,type:'spark',r:2.8,life:.72,glow:10,upBias:45});}
 sell(x,y){this.spawn(x,y,{color:'#d6c49b',count:20,power:75,type:'dust',r:2.7,life:.55,gravity:-3,upBias:18});this.ring(x,y,'#d6c49b',10,42,2,.36,.5);}
 death(enemy){const col=enemy.def.color;this.spawn(enemy.x,enemy.y,{color:col,count:enemy.def.boss?34:12,power:enemy.def.boss?145:72,type:enemy.def.id==='glacial'?'shard':'dust',r:enemy.def.boss?4:2.8,life:enemy.def.boss?.8:.5,gravity:18,glow:enemy.def.boss?8:2});this.ring(enemy.x,enemy.y,col,4,enemy.def.boss?88:36,enemy.def.boss?4:2,.45,.55);}
 nexus(x,y){this.ring(x,y,'#d08cff',12,92,5,.65,.65);this.spawn(x,y,{color:'#e7c4ff',count:24,power:110,type:'spark',r:3,life:.6,glow:10});}
 ring(x,y,color,from=5,to=40,width=2,life=.35,aspect=1){this.rings.push({x,y,color,from,to,width,life,max:life,aspect});}
 beam(points,color){if(points.length<2)return;const zig=[points[0]];for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],parts=Math.max(2,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/38));for(let j=1;j<parts;j++){const t=j/parts,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,off=(Math.random()-.5)*11;zig.push({x:a.x+dx*t-dy/len*off,y:a.y+dy*t+dx/len*off});}zig.push(b);}this.beams.push({points:zig,life:.15,max:.15,color,width:3});}
 damageText(x,y,text,color='#fff',critical=false,size=12){if(this.texts.length>55)return;this.texts.push({x,y,text:String(text),color,critical,size:critical?Math.max(15,size+3):size,life:.62,max:.62});}
 update(dt){for(let i=this.items.length-1;i>=0;i--){const p=this.items[i];p.life-=dt;if(p.life<=0){this.pool.push(p);this.items.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.gravity*dt;p.vx*=p.drag;p.vy*=p.drag;p.rot+=p.spin*dt;}for(let i=this.beams.length-1;i>=0;i--){this.beams[i].life-=dt;if(this.beams[i].life<=0)this.beams.splice(i,1);}for(let i=this.rings.length-1;i>=0;i--){this.rings[i].life-=dt;if(this.rings[i].life<=0)this.rings.splice(i,1);}for(let i=this.texts.length-1;i>=0;i--){this.texts[i].life-=dt;if(this.texts[i].life<=0)this.texts.splice(i,1);}}
 clear(){while(this.items.length)this.pool.push(this.items.pop());this.beams.length=0;this.rings.length=0;this.texts.length=0;}
}
