import { clamp } from './clock';

/**
 * Тело. Шесть шкал, все 0..100, где 100 — хорошо.
 * Ниже порогов начинаются последствия: сначала неудобство, потом смерть.
 */
export interface VitalsState {
  health: number;
  warmth: number;
  hunger: number;
  thirst: number;
  sanity: number;
  energy: number;
}

export interface BodyEnv {
  ambientC: number;
  /** Суммарная «прибавка» одежды в градусах. */
  insulationC: number;
  /** Тяжёлая работа греет, но жрёт энергию. */
  exertion?: number;
}

export type WarningId =
  | 'freezing'
  | 'frozen'
  | 'hungry'
  | 'starving'
  | 'thirsty'
  | 'dehydrated'
  | 'exhausted'
  | 'panicking'
  | 'collapsing';

export interface VitalsTick {
  warnings: WarningId[];
  causedDamage: number;
  froze: boolean;
}

const WARMTH_COMFORT = 18;

export class Vitals {
  state: VitalsState;

  constructor(init?: Partial<VitalsState>) {
    this.state = {
      health: 82,
      warmth: 62,
      hunger: 44,
      thirst: 38,
      sanity: 61,
      energy: 47,
      ...init,
    };
  }

  /** Эффективная температура с учётом одежды. */
  static feltTemperature(env: BodyEnv): number {
    const exertion = env.exertion ?? 0;
    return env.ambientC + env.insulationC + exertion;
  }

  /** Сколько тепла теряется в час при данной среде. */
  static warmthLossPerHour(env: BodyEnv): number {
    const felt = Vitals.feltTemperature(env);
    if (felt >= WARMTH_COMFORT) return -3.2;
    return clamp((WARMTH_COMFORT - felt) * 0.62, 0, 19);
  }

  tick(hours: number, env: BodyEnv): VitalsTick {
    const s = this.state;
    const before = { ...s };
    const warnings: WarningId[] = [];

    const loss = Vitals.warmthLossPerHour(env);
    s.warmth = clamp(s.warmth - loss * hours, 0, 100);

    s.hunger = clamp(s.hunger - 2.1 * hours, 0, 100);
    s.thirst = clamp(s.thirst - 3.3 * hours, 0, 100);
    s.energy = clamp(s.energy - (3.0 + (env.exertion ?? 0) * 0.4) * hours, 0, 100);

    let sanityRate = 0.9;
    if (s.warmth < 35) sanityRate += 0.7;
    if (s.energy < 25) sanityRate += 0.5;
    if (s.hunger < 20) sanityRate += 0.4;
    s.sanity = clamp(s.sanity - sanityRate * hours, 0, 100);

    let damage = 0;
    if (s.warmth < 30) damage += (30 - s.warmth) * 0.22 * hours;
    if (s.hunger <= 0) damage += 0.5 * hours;
    if (s.thirst <= 0) damage += 0.9 * hours;
    if (s.energy <= 0) damage += 0.2 * hours;

    const comfortable =
      s.warmth > 55 && s.hunger > 35 && s.thirst > 25 && s.energy > 30;
    if (damage === 0 && comfortable) {
      s.health = clamp(s.health + 0.42 * hours, 0, 100);
    } else {
      s.health = clamp(s.health - damage, 0, 100);
    }

    if (s.sanity < 20 && s.sanity + sanityRate * hours >= 20) warnings.push('panicking');
    if (before.warmth >= 30 && s.warmth < 30) warnings.push('freezing');
    if (before.warmth >= 12 && s.warmth < 12) warnings.push('frozen');
    if (before.hunger >= 20 && s.hunger < 20) warnings.push('hungry');
    if (before.hunger >= 5 && s.hunger < 5) warnings.push('starving');
    if (before.thirst >= 25 && s.thirst < 25) warnings.push('thirsty');
    if (before.thirst >= 8 && s.thirst < 8) warnings.push('dehydrated');
    if (before.energy >= 22 && s.energy < 22) warnings.push('exhausted');
    if (before.health >= 25 && s.health < 25) warnings.push('collapsing');

    return { warnings, causedDamage: damage, froze: s.warmth <= 0 };
  }

  damage(amount: number): void {
    this.state.health = clamp(this.state.health - amount, 0, 100);
  }

  heal(amount: number): void {
    this.state.health = clamp(this.state.health + amount, 0, 100);
  }

  get dead(): boolean {
    return this.state.health <= 0;
  }

  get frostbitten(): boolean {
    return this.state.warmth < 20;
  }
}
