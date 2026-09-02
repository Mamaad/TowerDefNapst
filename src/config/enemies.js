const e = (id, name, hp, speed, reward, profile, opts = {}) => ({
  id,
  name,
  hp,
  speed,
  reward,
  resistanceProfile: profile,
  size: 12,
  color: '#d8e7df',
  model: id,
  ...opts,
});

export const ELITE_MODIFIERS = Object.freeze({
  fortified: { id: 'fortified', name: 'FORTIFIÉ', hint: 'armure renforcée' },
  frenzied: { id: 'frenzied', name: 'FRÉNÉTIQUE', hint: 'accélère sous pression' },
  regenerating: { id: 'regenerating', name: 'RÉGÉNÉRANT', hint: 'régénération accrue' },
  protector: { id: 'protector', name: 'PROTECTEUR', hint: 'aura défensive locale' },
  unstable: { id: 'unstable', name: 'INSTABLE', hint: 'pulse de célérité à la mort' },
  corrupted: { id: 'corrupted', name: 'CORROMPU', hint: 'ward élémentaire renforcé' },
});

export const ENEMIES = {
  grunt: e('grunt', 'Pèlerin Corrompu', 72, 76, 9, 'neutral', {
    color: '#b7c9b4',
    role: 'standard',
  }),
  swift: e('swift', 'Feu-Follet', 46, 132, 8, 'neutral', {
    color: '#f3d98d', size: 9, role: 'rush', enrageAt: 0.35, enrageSpeed: 0.12,
  }),
  tank: e('tank', 'Golem de Siège', 260, 44, 20, 'stone', {
    color: '#9c8369', size: 17, armor: 0.07, armorFlat: 3.5, role: 'tank',
  }),
  mage: e('mage', 'Acolyte Runique', 130, 66, 15, 'warded', {
    color: '#9973c6', size: 13, ward: 1, role: 'magic',
  }),
  ember: e('ember', 'Salamandre de Cendre', 155, 72, 14, 'ember', {
    color: '#d85739', size: 13, role: 'elemental',
  }),
  glacial: e('glacial', 'Spectre de Givre', 145, 68, 14, 'glacial', {
    color: '#68bfd8', size: 13, role: 'elemental',
  }),
  regen: e('regen', 'Horreur Verdoyante', 190, 60, 18, 'verdant', {
    color: '#65a85c', regen: 5, size: 14, role: 'regen',
  }),
  shield: e('shield', 'Gardien Prismatique', 165, 58, 19, 'storm', {
    color: '#8bb5c8', shield: 95, shieldRegen: 8, shieldDelay: 3.2, size: 14, role: 'shield', protectorAura: 0.1, protectorRadius: 95,
  }),
  elite: e('elite', 'Champion du Néant', 520, 52, 45, 'warded', {
    color: '#a75dde', shield: 120, regen: 3, size: 18, armor: 0.08, armorFlat: 2, ward: 1, role: 'elite', enrageAt: 0.25, enrageSpeed: 0.16,
  }),
  colossus: e('colossus', 'Colosse du Rempart', 1450, 31, 130, 'stone', {
    color: '#c18d61', model: 'tank', shield: 260, size: 25, armor: 0.12, armorFlat: 5.5,
    boss: true, bossKind: 'colossus', breakablePlates: 2, ward: 1, livesDamage: 3, role: 'boss',
  }),
  boss: e('boss', 'Archonte du Nexus', 2850, 34, 240, 'warded', {
    color: '#c4459c', shield: 720, shieldRegen: 10, shieldDelay: 4, regen: 8, size: 27,
    armor: 0.1, armorFlat: 3, ward: 2, boss: true, bossKind: 'archon', breakablePlates: 3,
    enrageAt: 0.15, enrageSpeed: 0.34, livesDamage: 5, role: 'boss',
  }),
};
