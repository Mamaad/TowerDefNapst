export class ParticleSystem{
 constructor(){this.items=[];this.beams=[];}
 burst(x,y,color,count=8,power=55){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=power*(.35+Math.random()*.9);this.items.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:2+Math.random()*3,life:.25+Math.random()*.45,max:.7,color});}if(this.items.length>650)this.items.splice(0,this.items.length-650);}
 beam(points,color){this.beams.push({points,life:.14,max:.14,color});}
 update(dt){for(const p of this.items){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.94;p.vy*=.94;}this.items=this.items.filter(p=>p.life>0);for(const b of this.beams)b.life-=dt;this.beams=this.beams.filter(b=>b.life>0);}
}
