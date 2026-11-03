export type LogKind = 'narr' | 'info' | 'warn' | 'loot' | 'combat' | 'speech';

export interface LogEntry {
  id: number;
  text: string;
  kind: LogKind;
  clock: string;
}

/** Журнал. Всё, что сказано игроку, проходит через него. */
export class GameLog {
  private seq = 0;
  entries: LogEntry[] = [];

  push(text: string, kind: LogKind = 'info', clock = ''): LogEntry {
    const entry: LogEntry = { id: ++this.seq, text, kind, clock };
    this.entries.push(entry);
    if (this.entries.length > 160) this.entries.shift();
    return entry;
  }

  narr(text: string, clock?: string): void {
    this.push(text, 'narr', clock);
  }
  info(text: string, clock?: string): void {
    this.push(text, 'info', clock);
  }
  warn(text: string, clock?: string): void {
    this.push(text, 'warn', clock);
  }
  loot(text: string, clock?: string): void {
    this.push(text, 'loot', clock);
  }
  combat(text: string, clock?: string): void {
    this.push(text, 'combat', clock);
  }
  speech(who: string, text: string, clock?: string): void {
    this.push(`${who}: «${text}»`, 'speech', clock);
  }

  recent(n = 6): LogEntry[] {
    return this.entries.slice(-n);
  }

  since(id: number): LogEntry[] {
    return this.entries.filter((e) => e.id > id);
  }
}
