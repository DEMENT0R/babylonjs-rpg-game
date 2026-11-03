import './render/babylon';
import './ui/styles.css';
import { Renderer } from './render/engine';
import { Atmosphere } from './render/atmosphere';
import { TextureLibrary } from './render/textures';
import { Kit } from './render/world/kit';
import { buildFlat } from './render/world/flat';
import { FirstPersonController } from './game/controller';
import type { Level } from './render/world/level';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Не найден canvas');

const renderer = new Renderer(canvas);
const tex = new TextureLibrary(renderer.scene);
const kit = new Kit(renderer.scene, tex);
const atmosphere = new Atmosphere(renderer.scene, tex);

const levels = new Map<string, Level>();
levels.set('flat', buildFlat(renderer.scene, kit));

let current: Level = levels.get('flat')!;
for (const [id, level] of levels) {
  level.root.setEnabled(id === current.id);
}

const controller = new FirstPersonController(canvas, renderer.camera, {
  getCollision: () => current.col,
  isLocked: () => document.pointerLockElement === canvas,
  getEncumbrance: () => 0,
});
controller.teleport(current.spawn.x, current.spawn.y, current.spawn.z, current.spawn.yaw);
atmosphere.setInterior(current.outdoors ? 1 : 0.75);

renderer.onFrame((dt) => {
  controller.update(dt);
  atmosphere.update(dt, controller.position);
});

// отладочная ручка: сцены и состояние видны из консоли
(window as unknown as { __game: unknown }).__game = { renderer, levels, controller, atmosphere };

const ui = document.querySelector<HTMLDivElement>('#ui');
if (ui) {
  ui.innerHTML = `
    <div class="boot">
      <div class="boot__title">ПАНЕЛЬ</div>
      <div class="boot__sub">клик — войти в квартиру</div>
    </div>`;
  canvas.addEventListener('click', () => {
    ui.querySelector('.boot')?.remove();
  });
}
