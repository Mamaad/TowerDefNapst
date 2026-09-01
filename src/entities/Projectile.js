export class Projectile{
  constructor({tower,target,damage,element,speed=480,kind='orb',splash=0,meta={}}){this.tower=tower;this.target=target;this.x=tower.x;this.y=tower.y-14;this.damage=damage;this.element=element;this.speed=speed;this.kind=kind;this.splash=splash;this.meta=meta;this.dead=false;this.life=2.5;}
  update(dt,onImpact){this.life-=dt;if(this.life<=0||!this.target||this.target.dead){this.dead=true;return;}const dx=this.target.x-this.x,dy=this.target.y-this.y,dist=Math.hypot(dx,dy);const step=this.speed*dt;if(dist<step+8){this.x=this.target.x;this.y=this.target.y;this.dead=true;onImpact(this);return;}this.x+=dx/dist*step;this.y+=dy/dist*step;}
}
