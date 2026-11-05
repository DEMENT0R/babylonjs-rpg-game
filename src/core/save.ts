import type { LogKind } from './log';
import type { InventorySnapshot } from './inventory';
import type { VitalsState } from './vitals';
import type { HeatSnapshot } from './heat';

export const SAVE_KEY = 'panel.zone.save.v1';

/** 1 — первый выпуск: без тепла квартиры. 2 — топка и остывающий дом. */
const VERSION = 2;
const LEGACY_VERSION = 1;

/** Так было в первом выпуске: дом всегда +9, печь не топлена. */
const LEGACY_HEAT: HeatSnapshot = { temperature: 9, burnHours: 0 };

export interface SaveData {
  version: number;
  charId: string;
  vitals: VitalsState;
  inventory: InventorySnapshot;
  clock: { day: number; minutes: number };
  /** Тепло квартиры: без него дом к ночи не восстановить. */
  heat: HeatSnapshot;
  flags: Record<string, number | boolean | string>;
  level: string;
  position: { x: number; y: number; z: number; yaw: number };
  log: Array<{ text: string; kind: LogKind }>;
  savedAt: number;
}

export function writeSave(
  data: Omit<SaveData, 'version' | 'savedAt' | 'heat'> & { heat?: HeatSnapshot },
): void {
  try {
    const payload: SaveData = {
      heat: { ...LEGACY_HEAT },
      ...data,
      version: VERSION,
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // приватный режим браузера или переполненное хранилище — игра просто идёт дальше
  }
}

export function readSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    // Сохранение первого выпуска: квартира была константой, печи не было.
    if (data.version === LEGACY_VERSION) {
      data.heat = { ...LEGACY_HEAT };
      data.version = VERSION;
    }
    if (data.version !== VERSION) return null;
    if (!data.charId || !data.level) return null;
    if (!data.heat) data.heat = { ...LEGACY_HEAT };
    return data;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return readSave() !== null;
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ничего страшного
  }
}

export function describeSave(data: SaveData): string {
  const when = new Date(data.savedAt);
  const hh = String(when.getHours()).padStart(2, '0');
  const mm = String(when.getMinutes()).padStart(2, '0');
  const day = data.clock.day;
  return `день ${day} · ${hh}:${mm} реального времени`;
}
