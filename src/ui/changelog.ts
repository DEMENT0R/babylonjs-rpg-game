import {
  CHANGELOG,
  CURRENT_VERSION,
  markChangelogSeen,
  type ChangelogEntry,
} from '../content/changelog';

export interface ChangelogViewOptions {
  /** Куда вернуться: титульный экран или финал. */
  onBack: () => void;
}

/**
 * Экран «история изменений» поверх канваса.
 * Возвращает функцию уборки — слушатель Escape снимается вместе с оверлеем.
 */
export function renderChangelog(parent: HTMLElement, opts: ChangelogViewOptions): () => void {
  markChangelogSeen();

  const screen = el('div', 'clog');
  const panel = el('div', 'clog__panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'История изменений');

  const headText = el('div');
  const title = el('div', 'clog__title');
  title.textContent = 'история изменений';
  const sub = el('div', 'clog__sub mono');
  sub.textContent = `текущая версия · ${CURRENT_VERSION}`;
  headText.append(title, sub);

  const back = el('button', 'clog__close');
  back.type = 'button';
  back.textContent = 'назад';
  back.addEventListener('click', () => opts.onBack());

  const head = el('div', 'clog__head');
  head.append(headText, back);

  const body = el('div', 'clog__body');
  for (const entry of CHANGELOG) body.appendChild(entryView(entry));

  panel.append(head, body);
  screen.appendChild(panel);
  screen.addEventListener('click', (e) => {
    if (e.target === screen) opts.onBack();
  });
  parent.appendChild(screen);

  // в игре Esc освобождает курсор; здесь он просто закрывает экран
  const onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Escape') opts.onBack();
  };
  window.addEventListener('keydown', onKey);

  return () => window.removeEventListener('keydown', onKey);
}

function entryView(entry: ChangelogEntry): HTMLElement {
  const art = el('article', 'clog__entry');
  const current = !entry.unreleased && entry.version === CURRENT_VERSION;
  if (entry.unreleased) art.classList.add('clog__entry--soon');
  if (current) art.classList.add('clog__entry--current');

  const version = el('div', 'clog__version');
  version.textContent = entry.unreleased ? 'не выпущено' : entry.version;

  const head = el('div', 'clog__entry-head');
  head.appendChild(version);
  if (entry.date) {
    const date = el('span', 'clog__date mono');
    date.textContent = entry.date;
    head.appendChild(date);
  }
  if (entry.unreleased || current) {
    const badge = el('span', 'clog__badge');
    badge.textContent = entry.unreleased ? 'в работе' : 'текущая';
    head.appendChild(badge);
  }
  art.appendChild(head);

  if (entry.lead) {
    const lead = el('p', 'clog__lead');
    inline(lead, entry.lead);
    art.appendChild(lead);
  }

  for (const section of entry.sections) {
    const block = el('section', 'clog__section');
    const caption = el('h3', 'clog__sec-title');
    caption.textContent = section.title;
    block.appendChild(caption);

    for (const list of section.lists) {
      if (list.title) {
        const group = el('div', 'clog__group');
        group.textContent = list.title;
        block.appendChild(group);
      }
      if (!list.items.length) continue;
      const ul = el('ul', 'clog__list');
      for (const text of list.items) {
        const li = el('li', 'clog__item');
        inline(li, text);
        ul.appendChild(li);
      }
      block.appendChild(ul);
    }
    art.appendChild(block);
  }

  return art;
}

/**
 * Разметка внутри абзаца. `**жирный**`, `` `код` `` и `[ссылка](адрес)` —
 * ссылку показываем текстом: в игре из неё всё равно некуда перейти.
 */
function inline(parent: HTMLElement, text: string): void {
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > last) {
      parent.appendChild(document.createTextNode(text.slice(last, match.index)));
    }
    if (match[1] !== undefined) {
      const strong = document.createElement('strong');
      strong.textContent = match[1];
      parent.appendChild(strong);
    } else if (match[2] !== undefined) {
      const code = document.createElement('code');
      code.className = 'mono';
      code.textContent = match[2];
      parent.appendChild(code);
    } else {
      const link = document.createElement('span');
      link.className = 'clog__link';
      link.textContent = match[3] ?? '';
      if (match[4]) link.title = match[4];
      parent.appendChild(link);
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parent.appendChild(document.createTextNode(text.slice(last)));
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
