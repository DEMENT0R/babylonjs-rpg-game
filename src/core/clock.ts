/** Игровые часы и погода. Время — главный ресурс, а не декорация. */

export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 24 * 60;

export class Clock {
  day = 1;
  minutes = 7 * 60 + 40;

  advance(deltaMinutes: number): void {
    if (deltaMinutes <= 0) return;
    this.minutes += deltaMinutes;
    while (this.minutes >= MINUTES_PER_DAY) {
      this.minutes -= MINUTES_PER_DAY;
      this.day += 1;
    }
  }

  get hourFloat(): number {
    return this.minutes / MINUTES_PER_HOUR;
  }

  get hour(): number {
    return Math.floor(this.minutes / MINUTES_PER_HOUR);
  }

  get minute(): number {
    return this.minutes % MINUTES_PER_HOUR;
  }

  get label(): string {
    const h = String(this.hour).padStart(2, '0');
    const m = String(this.minute).padStart(2, '0');
    return `${h}:${m}`;
  }

  /** Тёмное время: с 16:40 до 08:10 зимой. Влияет на рассудок и видимость. */
  get isDark(): boolean {
    const h = this.hourFloat;
    return h < 8.2 || h >= 16.7;
  }

  get phaseLabel(): string {
    const h = this.hourFloat;
    if (h < 6) return 'ночь';
    if (h < 10) return 'утро';
    if (h < 16) return 'день';
    if (h < 19) return 'сумерки';
    return 'ночь';
  }

  static from(day: number, minutes: number): Clock {
    const c = new Clock();
    c.day = day;
    c.minutes = minutes;
    return c;
  }
}

/** Ядерная зима: база −26, дальше только холоднее. */
export const BASE_TEMP = -26;
export const TEMP_DRIFT_PER_DAY = -1.15;

/** Суточный ход: минимум в 05:00, максимум в 14:00. */
export function outsideTemperature(clock: Clock): number {
  const t = (clock.hourFloat - 5) / 24;
  const diurnal = -Math.cos(t * Math.PI * 2) * 2.6;
  const drift = (clock.day - 1) * TEMP_DRIFT_PER_DAY;
  const noise = Math.sin((clock.day * 7.13 + clock.minutes * 0.0031) * 1.7) * 0.8;
  return clamp(BASE_TEMP + drift + diurnal + noise, -45, -12);
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function formatTemperature(c: number): string {
  const rounded = Math.round(c);
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded)}°`;
}
