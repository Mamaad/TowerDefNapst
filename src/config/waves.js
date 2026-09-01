const unit=(type,count,interval=.55,delay=0)=>({type,count,interval,delay});
export const WAVE_COUNT=30;
export function getWave(n){
 const scale=1+Math.max(0,n-1)*.115+Math.max(0,n-10)*.018;
 let groups=[];let title=`Vague ${n}`;
 if(n<=5) groups=[unit('grunt',8+n*2,.62)];
 else if(n<=10) groups=[unit('grunt',7+n,.48),unit('swift',4+n,.30,.8)];
 else if(n<=15) groups=[unit(n%2?'ember':'glacial',7+Math.floor(n/2),.45),unit('mage',4+Math.floor(n/3),.7,.7),unit('swift',8,.28,1)];
 else if(n<=20) groups=[unit('tank',3+Math.floor(n/4),.9),unit('regen',7+Math.floor(n/2),.52,.4),unit('shield',5+Math.floor(n/3),.58,.9)];
 else groups=[unit('tank',5+Math.floor(n/5),.75),unit('mage',7+Math.floor(n/4),.48,.3),unit(n%2?'regen':'shield',9+Math.floor(n/3),.4,.7),unit('swift',12+Math.floor(n/2),.22,1.2)];
 if(n===10){title='Assaut des Veilleurs';groups.push(unit('elite',1,1,1.4));}
 if(n===20){title='Brisure du Rempart';groups.push(unit('elite',2,1.5,1.3));}
 if(n===30){title='ARCHONTE DU NEXUS';groups=[unit('shield',12,.38),unit('tank',8,.58,.4),unit('elite',3,1.1,.8),unit('boss',1,1,2.2)];}
 return{number:n,title,scale,goldBonus:38+n*4,groups};
}
