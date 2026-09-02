import { Game } from './core/Game.js';
import { WorldStrategyManager } from './systems/WorldStrategyManager.js';
import { installTowerInteractionController } from './systems/TowerInteractionController.js';

const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = './styles-world.css';
document.head.appendChild(style);

const canvas = document.getElementById('game');
const game = new Game(canvas);
game.world = new WorldStrategyManager(game);
installTowerInteractionController(game);

const subtitle = document.querySelector('.brand small');
if (subtitle) subtitle.textContent = 'WORLD & STRATEGY UPDATE';
document.title = 'TowerDefNapst — World & Strategy Update';
window.__towerDefNapst = game;
