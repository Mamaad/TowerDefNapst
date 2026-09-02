const t=(id,name,element,cost,damage,rate,range,special,projectile,opts={})=>({id,name,element,cost,damage,rate,range,special,projectile,maxLevel:3,...opts});
export const TOWERS=[
 t('ember-spire','Spire de Braise','fire',90,19,1.15,150,'Brûlure 4 s. Impact explosif au niveau 3.','orb',{burn:8,burnDuration:4,splash:24,description:'Une flamme condensée qui use les lignes compactes.'}),
 t('magma-forge','Forge Magmatique','fire',145,40,.58,135,'Explosion de zone massive, tir lent.','meteor',{splash:62,burn:5,burnDuration:3,description:'Projette des noyaux de magma sur les groupes.'}),
 t('frost-obelisk','Obélisque Givré','ice',95,12,1.35,165,'Ralentit de 35 % pendant 2.4 s.','shard',{slow:.35,slowDuration:2.4,description:'Contrôle fiable pour maintenir les cibles sous le feu.'}),
 t('cryo-prism','Prisme Cryo','ice',155,25,.8,180,'Fort ralentissement et chance de gel bref.','prism',{slow:.5,slowDuration:2.8,freezeChance:.14,description:'Cristallise le flux temporel autour de sa cible.'}),
 t('spark-coil','Bobine Volt','lightning',105,10,2.5,145,'Éclair en chaîne jusqu’à 3 cibles.','bolt',{chain:3,chainFalloff:.72,description:'Cadence extrême et dégâts distribués.'}),
 t('tempest-pylon','Pylône Tempête','lightning',170,18,1.65,190,'Chaîne longue, bonus sur cibles ralenties.','bolt',{chain:5,chainFalloff:.78,conductive:true,description:'Transforme les groupes contrôlés en réseau conducteur.'}),
 t('thorn-nest','Nid d’Épines','nature',85,9,1.7,155,'Poison cumulable, excellent contre les tanks.','thorn',{poison:6,poisonDuration:5,description:'Empile une toxine persistante qui ignore les boucliers.'}),
 t('bloom-sanctum','Sanctuaire Sylvestre','nature',150,16,1.05,175,'Poison de zone et aura de cadence aux tours proches.','seed',{poison:8,poisonDuration:4,auraRate:.1,auraRadius:120,splash:30,description:'Un support offensif qui accélère les défenses voisines.'}),
 t('stone-bastion','Bastion Tellurique','earth',110,33,.65,140,'Dégâts de zone et chance d’étourdir.','rock',{splash:45,stunChance:.12,stunDuration:.55,description:'Lent, physique et brutal. Idéal contre les essaims.'}),
 t('seismic-hammer','Marteau Sismique','earth',180,58,.46,155,'Onde sismique large, étourdissement fiable.','rock',{splash:72,stunChance:.24,stunDuration:.8,description:'Écrase les formations lourdes au prix d’une faible cadence.'}),
 t('arcane-eye','Œil Arcanique','arcane',125,23,1.15,205,'Pénètre 55 % des résistances élémentaires.','arc',{penetration:.55,description:'Une réponse polyvalente aux ennemis fortement résistants.'}),
 t('rift-weaver','Tisseur de Faille','arcane',190,31,.92,220,'Pénétration, marque amplificatrice et dégâts purs partiels.','arc',{penetration:.75,mark:1.18,markDuration:3.5,pureFraction:.22,description:'Déforme les défenses et prépare la cible aux autres tours.'})
];
export const TOWER_BY_ID=Object.fromEntries(TOWERS.map(x=>[x.id,x]));
export function levelStats(def,level,specialization=null){const l=Math.max(1,Math.min(3,level));const spec=getSpecialization(def.element,specialization);const mods=spec?.mods||{};return{damage:def.damage*(1+(l-1)*.48)*(mods.damage||1),rate:def.rate*(1+(l-1)*.16)*(mods.rate||1),range:def.range+(l-1)*10+(mods.range||0),splash:(def.splash||0)+(l-1)*6+(mods.splash||0)};}
export function upgradeCost(tower){return tower.level>=3?0:Math.round(tower.def.cost*(.7+tower.level*.42));}

export const ULTIMATES=Object.freeze({
 fire:{name:'METEOR STORM',cooldown:25,color:'#ff8a3d'},
 ice:{name:'ABSOLUTE ZERO',cooldown:27,color:'#bff7ff'},
 lightning:{name:'TEMPEST',cooldown:23,color:'#dff7ff'},
 nature:{name:'ANCIENT ROOTS',cooldown:26,color:'#b8f3a2'},
 earth:{name:'EARTHQUAKE',cooldown:28,color:'#e0b77e'},
 arcane:{name:'SINGULARITY',cooldown:24,color:'#e4c2ff'},
});

export const SPECIALIZATIONS=Object.freeze({
 fire:[{id:'inferno',name:'INFERNO',hint:'zone + brûlure',mods:{damage:1.08,splash:24,burn:1.35}},{id:'pyrelance',name:'PYRELANCE',hint:'cible unique + portée',mods:{damage:1.32,rate:.88,range:18}}],
 ice:[{id:'blizzard',name:'BLIZZARD',hint:'AOE + slow massif',mods:{damage:.92,splash:34,slow:1.18}},{id:'cryomancer',name:'CRYOMANCIEN',hint:'single target + freeze',mods:{damage:1.28,freeze:1.7,range:12}}],
 lightning:[{id:'stormfront',name:'FRONT DE TEMPÊTE',hint:'chaînes supplémentaires',mods:{damage:.94,chain:2,rate:1.12}},{id:'tesla-lance',name:'LANCE TESLA',hint:'portée + gros arc',mods:{damage:1.3,rate:.9,range:25}}],
 nature:[{id:'plague',name:'FLÉAU',hint:'poison renforcé',mods:{damage:1.02,poison:1.5,splash:16}},{id:'grovekeeper',name:'GARDIEN DU BOSQUET',hint:'support de cadence',mods:{damage:.9,aura:1.7,range:18}}],
 earth:[{id:'siegebreaker',name:'BRISE-SIÈGE',hint:'impact lourd + zone',mods:{damage:1.3,rate:.88,splash:28}},{id:'tectonic',name:'TECTONIQUE',hint:'contrôle + stun',mods:{damage:.98,stun:1.65,splash:14}}],
 arcane:[{id:'riftlord',name:'SEIGNEUR DE FAILLE',hint:'marque + dégâts purs',mods:{damage:1.16,pure:.12}},{id:'oracle',name:'ORACLE',hint:'portée + cadence',mods:{damage:.96,rate:1.18,range:28}}],
});
export function getSpecialization(element,id){return SPECIALIZATIONS[element]?.find(item=>item.id===id)||null;}
