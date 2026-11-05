import type { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Clock, outsideTemperature } from '../core/clock';
import { Heat } from '../core/heat';
import { GameLog } from '../core/log';
import { Player } from '../core/player';
import { readSave, writeSave } from '../core/save';
import { item } from '../core/items';
import type { WarningId } from '../core/vitals';
import type { Atmosphere } from '../render/atmosphere';
import type { Renderer } from '../render/engine';
import type { Level, Spot } from '../render/world/level';
import { buildFlat } from '../render/world/flat';
import { buildStairwell } from '../render/world/stairwell';
import { buildStreet } from '../render/world/street';
import { buildShop } from '../render/world/shop';
import { Kit } from '../render/world/kit';
import { TextureLibrary } from '../render/textures';
import { FirstPersonController } from './controller';
import { floorHeightAt } from '../render/collision';

export type GamePhase = 'title' | 'playing' | 'dialogue' | 'combat' | 'dead' | 'ending';

/** Звук подключается снаружи, чтобы симуляция о нём не знала. */
export interface Sfx {
  setOutdoor(outdoor: boolean): void;
  step(surface: 'snow' | 'floor' | 'stairs'): void;
  strike(): void;
  hurt(): void;
  ui(): void;
}

export interface GameEvents {
  onLog(): void;
  onVitals(): void;
  onSpot(spot: Spot | null): void;
  onPhase(phase: GamePhase): void;
  onTime(): void;
}

const MINUTES_PER_REAL_SECOND = 1 / 3;
const VITALS_STEP = 5;

export class Game {
  readonly renderer: Renderer;
  readonly atmosphere: Atmosphere;
  readonly controller: FirstPersonController;
  readonly log = new GameLog();
  readonly clock = new Clock();
  /** Тепло квартиры: пока топка горит, дом тянется к печной температуре. */
  heat = new Heat();
  readonly levels = new Map<string, Level>();
  readonly kit: Kit;

  player: Player | null = null;
  phase: GamePhase = 'title';
  flags: Record<string, number | boolean | string> = {};
  events!: GameEvents;
  sfx: Sfx | null = null;

  private currentLevelId = 'flat';
  private minuteAccumulator = 0;
  private vitalsAccumulator = 0;
  private lastSpotId: string | null = null;
  private heatWasLit = false;

  constructor(renderer: Renderer, atmosphere: Atmosphere) {
    this.renderer = renderer;
    this.atmosphere = atmosphere;
    const textures = new TextureLibrary(renderer.scene);
    this.kit = new Kit(renderer.scene, textures);

    this.levels.set('flat', buildFlat(renderer.scene, this.kit));
    this.levels.set('stairwell', buildStairwell(renderer.scene, this.kit));
    this.levels.set('street', buildStreet(renderer.scene, this.kit));
    this.levels.set('shop', buildShop(renderer.scene, this.kit));

    this.controller = new FirstPersonController(
      renderer.engine.getRenderingCanvas() as HTMLCanvasElement,
      renderer.camera as UniversalCamera,
      {
        getCollision: () => this.level.col,
        isLocked: () => document.pointerLockElement === this.renderer.engine.getRenderingCanvas(),
        getEncumbrance: () => this.player?.encumbrance ?? 0,
      },
    );
    this.controller.onStep = () => this.onFootstep();

    for (const [id, level] of this.levels) level.root.setEnabled(id === this.currentLevelId);
  }

  get level(): Level {
    return this.levels.get(this.currentLevelId)!;
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.engine.getRenderingCanvas() as HTMLCanvasElement;
  }

  startNew(charId: string): void {
    this.player = Player.create(charId);
    this.clock.day = 1;
    this.clock.minutes = 7 * 60 + 42;
    this.heat = new Heat();
    this.heatWasLit = false;
    this.flags = {};
    this.travelTo('flat', { silent: true });
    this.setPhase('playing');
  }

  private setPhase(phase: GamePhase): void {
    this.phase = phase;
    this.controller.enabled = phase === 'playing';
    if (phase !== 'playing') document.exitPointerLock();
    this.events.onPhase(phase);
  }

  enterPlay(): void {
    this.setPhase('playing');
  }

  travelTo(levelId: string, opts: { spawnAt?: string; silent?: boolean } = {}): void {
    const level = this.levels.get(levelId);
    if (!level) return;
    this.switchLevel(levelId);

    let spawn = level.spawn;
    if (opts.spawnAt) {
      const spot = level.spots.find((s) => s.id === opts.spawnAt);
      if (spot) {
        spawn = { x: spot.position[0], y: spot.position[1], z: spot.position[2], yaw: level.spawn.yaw };
      }
    }
    // Высоту берём у пола под точкой выхода, а не у самой точки. Точка стоит
    // на высоте глаз, поэтому ищем ближайший пол к её y — иначе на девятом
    // этаже подъезда сработал бы первый.
    const floorY = floorHeightAt(spawn.x, spawn.z, level.col, spawn.y);
    this.controller.teleport(spawn.x, floorY, spawn.z, spawn.yaw);
    this.applyLevelAtmosphere();
    this.applyHeatToLevel();
    if (!opts.silent) this.log.info(`— ${level.title} —`, this.clock.label);
    this.events.onVitals();
    this.events.onTime();
    if (!opts.silent) this.save();
  }

  private switchLevel(levelId: string): void {
    const level = this.levels.get(levelId);
    if (!level) return;
    for (const [id, lvl] of this.levels) lvl.root.setEnabled(id === levelId);
    this.currentLevelId = levelId;
  }

  private applyLevelAtmosphere(): void {
    const level = this.level;
    this.atmosphere.setInterior(level.outdoors ? 1 : 0.72);
    this.atmosphere.setIntensity(level.outdoors ? 1 : 0.35);
    this.sfx?.setOutdoor(level.outdoors);
  }

  /** Показать огонь в печи так, как он есть: зажжён или погас. */
  private applyHeatToLevel(): void {
    this.heatWasLit = this.heat.lit;
    this.level.setHeat?.(this.heatWasLit);
  }

  /** Огонь мог кончиться или начаться посреди шага — обновить свет. */
  private syncHeat(): void {
    if (this.heat.lit === this.heatWasLit) return;
    this.heatWasLit = this.heat.lit;
    this.level.setHeat?.(this.heatWasLit);
  }

  // ————— сохранение —————

  save(): void {
    if (!this.player || this.phase === 'title') return;
    writeSave({
      charId: this.player.def.id,
      vitals: { ...this.player.vitals.state },
      inventory: this.player.inventory.snapshot(),
      clock: { day: this.clock.day, minutes: this.clock.minutes },
      heat: this.heat.snapshot(),
      flags: { ...this.flags },
      level: this.currentLevelId,
      position: {
        x: this.controller.position.x,
        y: this.controller.position.y,
        z: this.controller.position.z,
        yaw: this.controller.yaw,
      },
      log: this.log.recent(12).map((e) => ({ text: e.text, kind: e.kind })),
    });
  }

  load(): boolean {
    const data = readSave();
    if (!data) return false;

    this.player = Player.restore({
      charId: data.charId,
      vitals: data.vitals,
      inventory: data.inventory,
    });
    this.clock.day = data.clock.day;
    this.clock.minutes = data.clock.minutes;
    this.heat = Heat.restore(data.heat);
    this.flags = { ...data.flags };

    this.log.entries = [];
    for (const entry of data.log) this.log.push(entry.text, entry.kind);

    this.switchLevel(data.level);
    const level = this.level;
    this.controller.teleport(data.position.x, data.position.y, data.position.z, data.position.yaw);
    void level;
    this.applyLevelAtmosphere();
    this.applyHeatToLevel();
    this.setPhase('playing');
    this.log.info('— продолжено —', this.clock.label);
    this.events.onLog();
    this.events.onVitals();
    this.events.onTime();
    return true;
  }

  get ambientC(): number {
    if (this.level.outdoors) return outsideTemperature(this.clock);
    // Квартира держит тепло сама: это симуляция, а не константа локации.
    return this.level.holdsHeat ? this.heat.temperature : this.level.ambientC;
  }

  update(dt: number): void {
    this.controller.update(dt);
    this.atmosphere.update(dt, this.controller.position);

    if (this.phase === 'playing') {
      this.minuteAccumulator += dt * MINUTES_PER_REAL_SECOND;
      while (this.minuteAccumulator >= 1) {
        this.minuteAccumulator -= 1;
        this.clock.advance(1);
        this.events.onTime();
      }
      this.vitalsAccumulator += dt;
      if (this.vitalsAccumulator > 1.2) {
        const minutes = (this.vitalsAccumulator * MINUTES_PER_REAL_SECOND);
        this.vitalsAccumulator = 0;
        this.tickVitals(minutes);
      }
      this.refreshSpot();
    }
  }

  /** Минуты внутриигрового времени, потраченные на действие. */
  spendMinutes(min: number): void {
    this.clock.advance(min);
    this.tickVitals(min);
    this.events.onTime();
  }

  private tickVitals(minutes: number): void {
    if (!this.player) return;
    const hours = minutes / 60;
    if (hours <= 0) return;
    // Дом остывает независимо от того, где ты: вернуться в тепло не выйдет,
    // если тепло нечем поддержать.
    this.heat.step(hours, outsideTemperature(this.clock));
    this.syncHeat();
    const res = this.player.vitals.tick(hours, {
      ambientC: this.ambientC,
      insulationC: this.player.insulation,
    });
    for (const w of res.warnings) this.warn(w);
    this.events.onVitals();
    if (this.player.vitals.dead) this.die('Ты замёрз. Это случилось тихо.');
  }

  private warn(id: WarningId): void {
    const text: Record<WarningId, string> = {
      freezing: 'Пальцы перестают слушаться. Тепло уходит быстрее, чем ты думаешь.',
      frozen: 'Холод больше не ощущается. Это худший из признаков.',
      hungry: 'Живот сводит. Пора что-нибудь съесть.',
      starving: 'Голод перестал быть голодом. Слабость.',
      thirsty: 'Во рту сухо.',
      dehydrated: 'Губы трескаются. Без воды осталось немного.',
      exhausted: 'Глаза слипаются на ходу.',
      panicking: 'Тишина становится слишком громкой.',
      collapsing: 'Ты держишься на чём-то, чего уже не чувствуешь.',
    };
    this.log.warn(text[id], this.clock.label);
    this.events.onLog();
  }

  die(cause: string): void {
    if (!this.player) return;
    this.player.vitals.state.health = 0;
    this.log.push(cause, 'warn', this.clock.label);
    this.events.onLog();
    this.setPhase('dead');
  }

  say(text: string): void {
    this.log.narr(text, this.clock.label);
    this.events.onLog();
  }

  info(text: string): void {
    this.log.info(text, this.clock.label);
    this.events.onLog();
  }

  speech(who: string, text: string): void {
    this.log.speech(who, text, this.clock.label);
    this.events.onLog();
  }

  give(id: string, n = 1): boolean {
    if (!this.player) return false;
    const def = item(id);
    const ok = this.player.inventory.add(id, n);
    if (ok) {
      this.log.loot(`Взято: ${def.name}${n > 1 ? ` ×${n}` : ''}`, this.clock.label);
      this.events.onVitals();
    } else {
      this.log.warn(`Рюкзак не вмещает: ${def.name}`, this.clock.label);
    }
    this.events.onLog();
    return ok;
  }

  take(id: string, n = 1): boolean {
    if (!this.player) return false;
    return this.player.inventory.remove(id, n);
  }

  getFlag(key: string): number | boolean | string | undefined {
    return this.flags[key];
  }

  setFlag(key: string, value: number | boolean | string = true): void {
    this.flags[key] = value;
    this.save();
  }

  /** Ближайшая точка интереса в пределах радиуса и в поле зрения. */
  findSpot(): Spot | null {
    const p = this.controller.position;
    const eye = new Vector3(p.x, p.y + 1.5, p.z);
    const forward = this.renderer.camera.getDirection(AxisZ);
    let best: Spot | null = null;
    let bestScore = -Infinity;

    for (const spot of this.level.spots) {
      const dx = spot.position[0] - eye.x;
      const dy = spot.position[1] - eye.y;
      const dz = spot.position[2] - eye.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > spot.radius) continue;
      const dot = (dx * forward.x + dy * forward.y + dz * forward.z) / Math.max(dist, 0.001);
      if (dot < 0.1) continue;
      const score = dot * 2 - dist / spot.radius;
      if (score > bestScore) {
        bestScore = score;
        best = spot;
      }
    }
    return best;
  }

  private refreshSpot(): void {
    const spot = this.findSpot();
    const id = spot?.id ?? null;
    if (id !== this.lastSpotId) {
      this.lastSpotId = id;
      this.events.onSpot(spot);
    }
  }

  private onFootstep(): void {
    const surface = this.level.outdoors ? 'snow' : this.level.id === 'stairwell' ? 'stairs' : 'floor';
    this.sfx?.step(surface);
  }

  setPhaseExternal(phase: GamePhase): void {
    this.setPhase(phase);
  }
}

// локальная ось +Z камеры: направление взгляда
import { Axis } from '@babylonjs/core/Maths/math.axis';
const AxisZ = Axis.Z;
