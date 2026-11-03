import type { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Clock, outsideTemperature } from '../core/clock';
import { GameLog } from '../core/log';
import { Player } from '../core/player';
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
    this.level.root.setEnabled(false);
    this.currentLevelId = levelId;
    level.root.setEnabled(true);

    let spawn = level.spawn;
    if (opts.spawnAt) {
      const spot = level.spots.find((s) => s.id === opts.spawnAt);
      if (spot) {
        spawn = { x: spot.position[0], y: spot.position[1] - 1.0, z: spot.position[2], yaw: level.spawn.yaw };
      }
    }
    this.controller.teleport(spawn.x, Math.max(0, spawn.y), spawn.z, spawn.yaw);
    this.atmosphere.setInterior(level.outdoors ? 1 : 0.72);
    this.atmosphere.setIntensity(level.outdoors ? 1 : 0.35);
    this.sfx?.setOutdoor(level.outdoors);
    if (!opts.silent) this.log.info(`— ${level.title} —`, this.clock.label);
    this.events.onVitals();
    this.events.onTime();
  }

  get ambientC(): number {
    return this.level.outdoors ? outsideTemperature(this.clock) : this.level.ambientC;
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
