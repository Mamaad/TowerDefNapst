export const ELEMENTS = {
  fire:{id:'fire',name:'Feu',color:'#ff754d',glyph:'△',identity:'Burst + brûlure',status:'burn'},
  ice:{id:'ice',name:'Glace',color:'#62ddff',glyph:'❄',identity:'Contrôle + gel',status:'slow'},
  lightning:{id:'lightning',name:'Foudre',color:'#b8e7ff',glyph:'ϟ',identity:'Cadence + chaîne',status:'shock'},
  nature:{id:'nature',name:'Nature',color:'#77e672',glyph:'❧',identity:'Poison + attrition',status:'poison'},
  earth:{id:'earth',name:'Terre',color:'#e6a55b',glyph:'◆',identity:'Impact + étourdissement',status:'stun'},
  arcane:{id:'arcane',name:'Arcane',color:'#c58aff',glyph:'✦',identity:'Pénétration + anomalie',status:'mark'}
};

export const RESISTANCE_PROFILES = {
  neutral:{fire:1,ice:1,lightning:1,nature:1,earth:1,arcane:1},
  ember:{fire:.38,ice:1.5,lightning:.95,nature:1.05,earth:1.05,arcane:1},
  glacial:{fire:1.5,ice:.35,lightning:1.12,nature:.9,earth:1.05,arcane:1},
  storm:{fire:1,ice:1.15,lightning:.32,nature:1.28,earth:1.38,arcane:.92},
  verdant:{fire:1.48,ice:.9,lightning:1.05,nature:.34,earth:1.2,arcane:.95},
  stone:{fire:.88,ice:.78,lightning:1.36,nature:1.18,earth:.4,arcane:1.3},
  warded:{fire:.68,ice:.68,lightning:.68,nature:.68,earth:1.18,arcane:.52}
};

export function elementalMultiplier(element, enemy, penetration=0){
  const base=(RESISTANCE_PROFILES[enemy.resistanceProfile]||RESISTANCE_PROFILES.neutral)[element]??1;
  if(base<1 && penetration>0) return base+(1-base)*Math.min(.85,penetration);
  return base;
}
