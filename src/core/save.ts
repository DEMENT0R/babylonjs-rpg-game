import type { LogKind } from './log';
import type { InventorySnapshot } from './inventory';
import type { VitalsState } from './vitals';

export const SAVE_KEY = 'panel.zone.save.v1';
const VERSION = 1;

export interface SaveData {
  version: number;
  charId: string;
  vitals: VitalsState;
  inventory: InventorySnapshot;
  clock: { day: number; minutes: number };
  flags: Record<string, number | boolean | string>;
  level: string;
  position: { x: number; y: number; z: number; yaw: number };
  log: Array<{ text: string; kind: LogKind }>;
  savedAt: number;
}

export function writeSave(data: Omit<SaveData, 'version' | 'savedAt'>): void {
  try {
    const payload: SaveData = { ...data, version: VERSION, savedAt: Date.now() };
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
    if (data.version !== VERSION) return null;
    if (!data.charId || !data.level) return null;
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
