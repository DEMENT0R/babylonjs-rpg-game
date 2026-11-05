import { clamp } from './clock';

/**
 * Тепло квартиры. Отопления нет: без топки дом остывает к уличной
 * температуре, с топкой — тянется к печной. Это такой же ресурс, как еда
 * и вода, просто его нельзя положить в рюкзак: его видно в HUD, и он
 * кончается ровно тогда, когда нужен больше всего.
 *
 * Числа подобраны так, чтобы за день без огня квартира из +9 уходила в минус,
 * а ночь без топки отнимала здоровье — но убивала только тех, кто лёг спать
 * уже в холодном доме.
 */

/** К чему остывает дом без огня: соседи, кирпич, остатки чужого тепла. */
const COLD_SHELTER_C = 13;

/** Постоянная времени остывания, часы. Панельный дом массивный. */
const COOL_HOURS = 11;

/** К чему тянет растопленная печь. */
export const STOVE_C = 19;

/** Постоянная времени нагрева, часы. */
const HEAT_HOURS = 1.4;

export interface HeatSnapshot {
  temperature: number;
  burnHours: number;
}

export class Heat {
  /** Температура в комнате, °C. */
  temperature: number;
  /** Сколько часов ещё прогорит топка. */
  burnHours: number;

  constructor(init?: Partial<HeatSnapshot>) {
    this.temperature = init?.temperature ?? 9;
    this.burnHours = init?.burnHours ?? 0;
  }

  get lit(): boolean {
    return this.burnHours > 0;
  }

  /** Подложить топливо. Часы горения — единственная валюта печи. */
  addFuel(hours: number): void {
    if (hours > 0) this.burnHours += hours;
  }

  /**
   * Прожить `hours` часов при уличной `outdoorC`.
   * Пока горит топка — к печной температуре, потом (и после) — к уличной.
   */
  step(hours: number, outdoorC: number): void {
    if (hours <= 0) return;

    let left = hours;
    if (this.burnHours > 0) {
      const burn = Math.min(this.burnHours, left);
      this.burnHours -= burn;
      this.temperature = approach(this.temperature, STOVE_C, burn, HEAT_HOURS);
      left -= burn;
    }
    if (left > 0) {
      this.temperature = approach(this.temperature, outdoorC + COLD_SHELTER_C, left, COOL_HOURS);
    }
    this.temperature = clamp(this.temperature, -40, 30);
    this.burnHours = Math.max(0, this.burnHours);
  }

  /** Что будет с комнатой через `hours`, если ничего не менять. */
  peek(hours: number, outdoorC: number): number {
    const copy = new Heat(this.snapshot());
    copy.step(hours, outdoorC);
    return copy.temperature;
  }

  snapshot(): HeatSnapshot {
    return { temperature: this.temperature, burnHours: this.burnHours };
  }

  static restore(snap: HeatSnapshot): Heat {
    return new Heat(snap);
  }
}

/** Экспоненциальное приближение: так остывает всё, у чего есть масса. */
function approach(from: number, to: number, hours: number, tau: number): number {
  return to + (from - to) * Math.exp(-hours / tau);
}
