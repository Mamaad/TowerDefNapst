export const ELEMENTS = {
  fire: { id: 'fire', name: 'Feu', color: '#ff6d35', light: '#ffd09b', dark: '#5f190e', identity: 'Burst + brûlure', status: 'burn' },
  ice: { id: 'ice', name: 'Glace', color: '#5ee8ff', light: '#dcfbff', dark: '#124a68', identity: 'Contrôle + gel', status: 'slow' },
  lightning: { id: 'lightning', name: 'Foudre', color: '#8bc8ff', light: '#f4fbff', dark: '#243d78', identity: 'Cadence + chaîne', status: 'shock' },
  nature: { id: 'nature', name: 'Nature', color: '#79e06f', light: '#d9ffc8', dark: '#24532b', identity: 'Poison + attrition', status: 'poison' },
  earth: { id: 'earth', name: 'Terre', color: '#dba05f', light: '#ffe0a8', dark: '#604028', identity: 'Impact + étourdissement', status: 'stun' },
  arcane: { id: 'arcane', name: 'Arcane', color: '#ba7bff', light: '#f0dfff', dark: '#482074', identity: 'Pénétration + anomalie', status: 'mark' },
};

export const RESISTANCE_PROFILES = {
  neutral: { fire: 1, ice: 1, lightning: 1, nature: 1, earth: 1, arcane: 1 },
  ember: { fire: 0.38, ice: 1.5, lightning: 0.95, nature: 1.05, earth: 1.05, arcane: 1 },
  glacial: { fire: 1.5, ice: 0.35, lightning: 1.12, nature: 0.9, earth: 1.05, arcane: 1 },
  storm: { fire: 1, ice: 1.15, lightning: 0.32, nature: 1.28, earth: 1.38, arcane: 0.92 },
  verdant: { fire: 1.48, ice: 0.9, lightning: 1.05, nature: 0.34, earth: 1.2, arcane: 0.95 },
  stone: { fire: 0.88, ice: 0.78, lightning: 1.36, nature: 1.18, earth: 0.4, arcane: 1.3 },
  warded: { fire: 0.68, ice: 0.68, lightning: 0.68, nature: 0.68, earth: 1.18, arcane: 0.52 },
};

export const ELEMENTAL_COMBOS = Object.freeze({
  toxicIgnition: { id: 'toxicIgnition', name: 'COMBUSTION TOXIQUE', elements: ['nature', 'fire'], color: '#ffb04a' },
  shatter: { id: 'shatter', name: 'SHATTER', elements: ['ice', 'earth'], color: '#d9fbff' },
  overload: { id: 'overload', name: 'SURCHARGE', elements: ['ice', 'lightning'], color: '#dff7ff' },
  resonance: { id: 'resonance', name: 'RÉSONANCE', elements: ['arcane', 'any'], color: '#e8c8ff' },
});

export function elementalMultiplier(element, enemy, penetration = 0) {
  const profile = RESISTANCE_PROFILES[enemy.resistanceProfile] || RESISTANCE_PROFILES.neutral;
  let value = profile[element] ?? 1;
  if (value < 1 && penetration > 0) value = value + (1 - value) * Math.min(0.85, penetration);
  if (enemy.modifiers?.has?.('corrupted') && element !== 'earth') {
    const wardStrength = 0.16 * (1 - Math.min(0.85, penetration));
    value *= 1 - wardStrength;
  }
  return value;
}
