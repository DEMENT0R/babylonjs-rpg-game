import './render/babylon';
import './ui/styles.css';
import { Renderer } from './render/engine';
import { Atmosphere } from './render/atmosphere';
import { TextureLibrary } from './render/textures';
import { Game } from './game/game';
import { UI } from './ui/ui';
import { Scenario } from './content/scenario';
import { Sound } from './audio/sound';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Нет canvas');

const renderer = new Renderer(canvas);
const textures = new TextureLibrary(renderer.scene);
const atmosphere = new Atmosphere(renderer.scene, textures);
const game = new Game(renderer, atmosphere);
const ui = new UI(game);
const scenario = new Scenario(game, ui);
const sound = new Sound();
game.sfx = sound;

document.addEventListener('click', (e) => {
  if ((e.target as HTMLElement | null)?.closest('button')) sound.ui();
});

game.events = {
  onLog: () => ui.renderLog(),
  onVitals: () => ui.renderVitals(),
  onSpot: (spot) => ui.setSpot(spot),
  onPhase: (phase) => ui.onPhase(phase),
  onTime: () => ui.renderTime(),
};

game.controller.onInteract = () => {
  if (game.phase !== 'playing') return;
  if (ui.isInventoryOpen()) return;
  const spot = game.findSpot();
  if (spot) scenario.handle(spot);
};

ui.showTitle(() => {
  sound.init();
  ui.showClassSelect((character) => {
    ui.closeOverlay();
    game.startNew(character.id);
    scenario.intro();
    ui.renderVitals();
    ui.renderLog();
    ui.renderTime();
    game.enterPlay();
    canvas.requestPointerLock();
  });
});

canvas.addEventListener('click', () => {
  if (game.phase === 'playing' && document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
  }
});

renderer.onFrame((dt) => {
  game.update(dt);
});

// отладочная ручка: состояние видно из консоли
(window as unknown as { __game: unknown }).__game = { game, renderer, ui, scenario };
