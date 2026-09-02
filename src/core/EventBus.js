export class EventBus {
  constructor() { this.listeners = new Map(); }
  on(type, handler) { const set = this.listeners.get(type) || new Set(); set.add(handler); this.listeners.set(type, set); return () => this.off(type, handler); }
  once(type, handler) { const off = this.on(type, (payload) => { off(); handler(payload); }); return off; }
  off(type, handler) { const set = this.listeners.get(type); if (!set) return; set.delete(handler); if (!set.size) this.listeners.delete(type); }
  emit(type, payload = {}) { const set = this.listeners.get(type); if (!set) return; for (const handler of [...set]) handler(payload); }
  clear() { this.listeners.clear(); }
  listenerCount(type) { return this.listeners.get(type)?.size || 0; }
}
export const WORLD_EVENTS = Object.freeze({
  ENEMY_KILLED:'ENEMY_KILLED',WAVE_STARTED:'WAVE_STARTED',WAVE_COMPLETED:'WAVE_COMPLETED',BOSS_PHASE_CHANGED:'BOSS_PHASE_CHANGED',SURFACE_CREATED:'SURFACE_CREATED',COMBO_TRIGGERED:'COMBO_TRIGGERED',TOWER_UPGRADED:'TOWER_UPGRADED',TOWER_VETERANCY:'TOWER_VETERANCY',NEXUS_DAMAGED:'NEXUS_DAMAGED',ARTIFACT_CHOSEN:'ARTIFACT_CHOSEN',MAP_EVENT:'MAP_EVENT',OBJECTIVE_COMPLETED:'OBJECTIVE_COMPLETED',TRAIT_GRANTED:'TRAIT_GRANTED',ROUTE_CHANGED:'ROUTE_CHANGED',NEXUS_ABILITY:'NEXUS_ABILITY'
});
