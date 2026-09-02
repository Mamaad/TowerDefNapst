const unit = (type, count, interval = 0.55, delay = 0, modifiers = []) => ({ type, count, interval, delay, modifiers });
export const WAVE_COUNT = 30;

const named = {
  4: ['PREMIÈRE RUÉE', 'Des éclaireurs testent les lignes'],
  8: ['LES RUNES SE LÈVENT', 'Premiers wards et boucliers'],
  10: ['VEILLEUR NOIR', 'Un champion fortifié ouvre la marche'],
  14: ['LA MEUTE', 'Vitesse avant robustesse'],
  18: ['ASSAUT BLINDÉ', 'Ligne lourde et protecteurs'],
  20: ['LE COLOSSE', 'Brisez ses plaques avant le Nexus'],
  24: ['TENAILLE ÉLÉMENTAIRE', 'Affinités opposées en cadence'],
  27: ['LA GARDE CORROMPUE', 'Wards renforcés et élites'],
  29: ['DERNIER REMPART', 'Tout ce que la faille peut envoyer'],
  30: ['ARCHONTE DU NEXUS', 'Boss final à phases multiples'],
};

function baseGroups(n) {
  if (n <= 3) return [unit('grunt', 8 + n * 3, 0.62 - n * 0.025)];
  if (n <= 6) return [
    unit('grunt', 9 + n, 0.48),
    unit('swift', 4 + n, n === 4 ? 0.25 : 0.31, 0.7),
  ];
  if (n <= 9) return [
    unit('grunt', 8 + n, 0.46),
    unit('swift', 6 + Math.floor(n / 2), 0.29, 0.45),
    unit(n % 2 ? 'mage' : 'shield', 3 + Math.floor(n / 3), 0.72, 0.8),
  ];
  if (n <= 13) return [
    unit(n % 2 ? 'ember' : 'glacial', 7 + Math.floor(n / 2), 0.43),
    unit('mage', 4 + Math.floor(n / 3), 0.68, 0.65),
    unit('swift', 8, 0.27, 0.9),
  ];
  if (n <= 17) return [
    unit('swift', n === 14 ? 24 : 10 + Math.floor(n / 2), n === 14 ? 0.17 : 0.25),
    unit('regen', 6 + Math.floor(n / 2), 0.48, 0.5),
    unit(n % 2 ? 'glacial' : 'ember', 7, 0.41, 0.9),
  ];
  if (n <= 23) return [
    unit('tank', 4 + Math.floor(n / 4), 0.82, 0, n >= 18 ? ['fortified'] : []),
    unit('shield', 5 + Math.floor(n / 3), 0.54, 0.42, n >= 18 ? ['protector'] : []),
    unit('regen', 7 + Math.floor(n / 2), 0.48, 0.75, n >= 21 ? ['regenerating'] : []),
    unit('swift', 10, 0.24, 1.05, n >= 22 ? ['frenzied'] : []),
  ];
  return [
    unit('tank', 6 + Math.floor(n / 5), 0.72, 0, ['fortified']),
    unit('mage', 7 + Math.floor(n / 4), 0.46, 0.3, n >= 27 ? ['corrupted'] : []),
    unit(n % 2 ? 'regen' : 'shield', 9 + Math.floor(n / 3), 0.38, 0.65, n >= 26 ? ['protector'] : []),
    unit('swift', 12 + Math.floor(n / 2), 0.21, 1.0, ['frenzied']),
  ];
}

export function getWave(n) {
  const number = Math.max(1, Math.min(WAVE_COUNT, n));
  const scale = 1 + Math.max(0, number - 1) * 0.105 + Math.max(0, number - 10) * 0.017;
  let groups = baseGroups(number);
  let title = `VAGUE ${number}`;
  let subtitle = number < 10 ? 'La faille teste vos défenses' : number < 20 ? 'La pression élémentaire augmente' : 'Assaut combiné de la faille';

  if (number === 10) groups.push(unit('elite', 1, 1, 1.35, ['fortified']));
  if (number === 18) groups.push(unit('elite', 1, 1, 1.2, ['protector']));
  if (number === 20) groups = [
    unit('tank', 7, 0.66, 0, ['fortified']),
    unit('shield', 6, 0.48, 0.55, ['protector']),
    unit('colossus', 1, 1, 1.85),
  ];
  if (number === 24) groups = [
    unit('ember', 12, 0.34),
    unit('glacial', 12, 0.34, 0.28),
    unit('mage', 8, 0.5, 0.6, ['corrupted']),
    unit('swift', 14, 0.2, 0.9, ['frenzied']),
  ];
  if (number === 27) groups.push(unit('elite', 2, 1.0, 1.2, ['corrupted', 'regenerating']));
  if (number === 29) groups.push(unit('elite', 3, 0.82, 1.0, ['fortified', 'frenzied']));
  if (number === 30) groups = [
    unit('shield', 12, 0.35, 0, ['protector']),
    unit('tank', 9, 0.52, 0.35, ['fortified']),
    unit('elite', 3, 0.95, 0.75, ['corrupted']),
    unit('boss', 1, 1, 2.15),
  ];

  if (named[number]) [title, subtitle] = named[number];
  return {
    number,
    title,
    subtitle,
    scale,
    goldBonus: 38 + number * 4,
    groups,
  };
}

export function summarizeWave(wave) {
  const totals = new Map();
  for (const group of wave.groups) {
    const current = totals.get(group.type) || { type: group.type, count: 0, modifiers: new Set() };
    current.count += group.count;
    for (const modifier of group.modifiers || []) current.modifiers.add(modifier);
    totals.set(group.type, current);
  }
  return [...totals.values()].map((item) => ({ ...item, modifiers: [...item.modifiers] }));
}

export function getEndlessWave(number){
  const n=Math.max(WAVE_COUNT+1,number);const tier=n-WAVE_COUNT;const scale=4.25+tier*0.145+Math.floor(tier/8)*0.08;const cycle=tier%5;const elite=tier>=3?['fortified']:[];const corrupted=tier>=7?['corrupted']:[];const groups=[];
  if(cycle===1){groups.push(unit('swift',22+tier,0.17,0,['frenzied']),unit('mage',7+Math.floor(tier/2),0.42,.5,corrupted));}
  else if(cycle===2){groups.push(unit('tank',8+Math.floor(tier/2),0.58,0,['fortified']),unit('shield',8+Math.floor(tier/2),0.38,.4,['protector']));}
  else if(cycle===3){groups.push(unit('ember',13+tier,0.29),unit('glacial',13+tier,0.29,.25),unit('elite',1+Math.floor(tier/8),.9,.8,['regenerating']));}
  else if(cycle===4){groups.push(unit('regen',12+tier,0.31,0,['regenerating']),unit('mage',9+Math.floor(tier/2),0.4,.4,corrupted),unit('swift',16+tier,0.18,.8,['frenzied']));}
  else{groups.push(unit('tank',7+Math.floor(tier/2),.54,0,elite),unit('shield',8+Math.floor(tier/2),.35,.3,['protector']),unit('elite',2+Math.floor(tier/7),.78,.7,['fortified','frenzied']));if(tier%10===0)groups.push(unit(tier%20===0?'boss':'colossus',1,1,1.8));}
  return{number:n,title:`ENDLESS ${tier}`,subtitle:tier%10===0?'Menace majeure cyclique':'La faille ne se referme plus',scale,goldBonus:80+Math.round(tier*7.5),groups};
}
export function getWaveForNumber(number,endless=false){return number<=WAVE_COUNT?getWave(number):(endless?getEndlessWave(number):getWave(WAVE_COUNT));}
