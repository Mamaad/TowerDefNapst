export function installWorldLifecycleController(game) {
  const world = game?.world;
  const waveManager = game?.waveManager;
  if (!world || !waveManager) return game;

  const start = waveManager.start.bind(waveManager);
  waveManager.start = (manual = true) => {
    const choice = world.director?.waveChoice;
    if (!manual && choice && !choice.selected) {
      const fallback = choice.options?.[0]?.id;
      if (fallback) {
        world.director.chooseWave(fallback);
        world.hud?.hideModal?.();
        game.ui?.toast?.(`Choix tactique auto · ${choice.options[0].name}`);
      }
    }
    return start(manual);
  };

  const spawn = waveManager.spawn.bind(waveManager);
  waveManager.spawn = (type, modifiers = []) => {
    const enemy = spawn(type, modifiers);
    waveManager.pending = waveManager.queue?.length || 0;
    return enemy;
  };

  if (typeof waveManager.enqueueEscort === 'function') {
    const enqueueEscort = waveManager.enqueueEscort.bind(waveManager);
    waveManager.enqueueEscort = (...args) => {
      const out = enqueueEscort(...args);
      waveManager.pending = waveManager.queue?.length || 0;
      return out;
    };
  }

  const continueEndless = game.continueEndless.bind(game);
  game.continueEndless = () => {
    const wasCampaignComplete = Boolean(game.state.campaignComplete);
    const out = continueEndless();
    if (wasCampaignComplete && game.state.endless) {
      world.preparedWave = 0;
      world.prepareNextWave?.(true);
      world.hud?.sync?.(true);
    }
    return out;
  };

  const campaignComplete = game.campaignComplete.bind(game);
  game.campaignComplete = () => {
    const out = campaignComplete();
    // WorldStrategyManager may add Perfect Defense score after the base game
    // already persisted. Persist once more so the recorded best score is exact.
    game.persistScore?.();
    return out;
  };

  return game;
}
