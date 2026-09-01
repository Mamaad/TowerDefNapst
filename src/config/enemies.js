const e=(id,name,hp,speed,reward,profile,opts={})=>({id,name,hp,speed,reward,resistanceProfile:profile,size:12,color:'#d8e7df',...opts});
export const ENEMIES={
 grunt:e('grunt','Pèlerin Corrompu',72,76,9,'neutral',{color:'#cfdfc8'}),
 swift:e('swift','Feu-Follet',46,132,8,'neutral',{color:'#ffe8a3',size:9}),
 tank:e('tank','Golem de Siège',260,44,20,'stone',{color:'#a99178',size:17,armor:.08}),
 mage:e('mage','Acolyte Runique',130,66,15,'warded',{color:'#a98ad7',size:13}),
 ember:e('ember','Salamandre de Cendre',155,72,14,'ember',{color:'#ff7755',size:13}),
 glacial:e('glacial','Spectre de Givre',145,68,14,'glacial',{color:'#7edfff',size:13}),
 regen:e('regen','Horreur Verdoyante',190,60,18,'verdant',{color:'#79c46d',regen:5,size:14}),
 shield:e('shield','Gardien Prismatique',165,58,19,'storm',{color:'#b8d9ec',shield:95,size:14}),
 elite:e('elite','Champion du Néant',520,52,45,'warded',{color:'#dc8cff',shield:120,regen:3,size:18,armor:.1}),
 boss:e('boss','Archonte du Nexus',2500,34,220,'warded',{color:'#ff69cb',shield:650,regen:9,size:27,armor:.12,boss:true,livesDamage:5})
};
