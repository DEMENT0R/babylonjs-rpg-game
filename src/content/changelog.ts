/**
 * История изменений для экрана в самой игре.
 *
 * Единственный источник — CHANGELOG.md в корне репозитория: файл приезжает
 * в сборку как текст (`?raw`) и разбирается здесь. Поэтому список версий
 * в игре и файл для людей не могут разойтись — правка CHANGELOG.md сразу
 * меняет и то, что видит игрок.
 */
import raw from '../../CHANGELOG.md?raw';

export interface ChangelogList {
  /** Заголовок группы внутри раздела, например «Мир и рендер». */
  title: string | null;
  items: string[];
}

export interface ChangelogSection {
  title: string;
  lists: ChangelogList[];
}

export interface ChangelogEntry {
  version: string;
  date: string | null;
  unreleased: boolean;
  /** Абзац под заголовком версии — короткое описание выпуска. */
  lead: string;
  sections: ChangelogSection[];
}

/** `## [0.1.0] — 2026-11-04` и `## [Не выпущено]`. */
const HEADING = /^##\s+\[([^\]]+)\](?:\s+—\s+(.+?))?\s*$/;
const SECTION = /^###\s+(.+?)\s*$/;
const GROUP = /^\*\*(.+?)\*\*\s*$/;
const BULLET = /^[-*]\s+(.*)$/;

/**
 * Разбирает ровно тот подмножество Markdown, которое используется в CHANGELOG.md:
 * заголовки версий и разделов, группы, списки с переносами строк.
 * Всё, что не похоже на запись версии (`# История изменений`, `## Как обновлять`),
 * пропускается — в игре эти служебные разделы не нужны.
 */
export function parseChangelog(markdown: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let entry: ChangelogEntry | null = null;
  let section: ChangelogSection | null = null;
  let list: ChangelogList | null = null;
  let item: string[] | null = null;
  let lead: string[] = [];

  const closeItem = (): void => {
    if (list && item) list.items.push(item.join(' ').trim());
    item = null;
  };

  for (const source of markdown.split(/\r?\n/)) {
    const text = source.replace(/\s+$/, '').trim();
    if (!text) continue;

    const heading = HEADING.exec(text);
    if (heading) {
      closeItem();
      if (entry) {
        if (lead.length) entry.lead = lead.join(' ');
        entries.push(entry);
      }
      lead = [];
      entry = {
        version: heading[1].trim(),
        date: heading[2]?.trim() ?? null,
        unreleased: /не\s+выпущено/i.test(heading[1]),
        lead: '',
        sections: [],
      };
      section = null;
      list = null;
      continue;
    }

    if (!entry) continue;

    // «Как обновлять» и прочая служебная шапка идут после выпусков — на этом разбор кончается
    if (/^#{1,2}\s/.test(text)) break;

    const sec = SECTION.exec(text);
    if (sec) {
      closeItem();
      section = { title: sec[1], lists: [] };
      entry.sections.push(section);
      list = null;
      continue;
    }

    if (!section) {
      lead.push(text);
      continue;
    }

    const group = GROUP.exec(text);
    if (group) {
      closeItem();
      list = { title: group[1], items: [] };
      section.lists.push(list);
      continue;
    }

    const bullet = BULLET.exec(text);
    if (bullet) {
      closeItem();
      if (!list) {
        list = { title: null, items: [] };
        section.lists.push(list);
      }
      item = [bullet[1]];
      continue;
    }

    // строка без разметки — продолжение предыдущего пункта (перенос по ширине)
    if (item) item.push(text);
  }

  closeItem();
  if (entry) {
    if (lead.length) entry.lead = lead.join(' ');
    entries.push(entry);
  }

  return entries;
}

export const CHANGELOG: ChangelogEntry[] = parseChangelog(raw);

/** Текущая версия — последний выпуск в файле, а не отдельная константа. */
export const CURRENT_VERSION: string =
  CHANGELOG.find((e) => !e.unreleased)?.version ?? '0.0.0';

const SEEN_KEY = 'panel.changelog.seen';

export function readSeenVersion(): string | null {
  try {
    return window.localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

export function markChangelogSeen(): void {
  try {
    window.localStorage.setItem(SEEN_KEY, CURRENT_VERSION);
  } catch {
    /* приватный режим — просто не запоминаем */
  }
}

/** Есть ли что показать в «что нового»: игрок ещё не видел эту версию. */
export function hasUnseenChanges(): boolean {
  return readSeenVersion() !== CURRENT_VERSION;
}
