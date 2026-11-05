import { CHARACTERS, STAT_LABELS, type CharacterDef } from '../content/classes';
import { CURRENT_VERSION, hasUnseenChanges } from '../content/changelog';
import { formatTemperature } from '../core/clock';
import { item } from '../core/items';
import type { Game, GamePhase } from '../game/game';
import type { Spot } from '../render/world/level';
import { renderChangelog } from './changelog';

export interface DialogueOption {
  id: string;
  text: string;
  note?: string;
  disabled?: boolean;
}

export interface DialogueView {
  who: string;
  text: string;
  options: DialogueOption[];
}

export interface TitleScreenOptions {
  onStart: () => void;
  onContinue?: () => void;
  continueHint?: string;
}

const BARS: Array<{ key: 'health' | 'warmth' | 'hunger' | 'thirst' | 'sanity' | 'energy'; label: string; low: number }> = [
  { key: 'health', label: 'здоровье', low: 30 },
  { key: 'warmth', label: 'тепло', low: 30 },
  { key: 'hunger', label: 'еда', low: 25 },
  { key: 'thirst', label: 'вода', low: 25 },
  { key: 'sanity', label: 'рассудок', low: 25 },
  { key: 'energy', label: 'силы', low: 20 },
];

export class UI {
  private root: HTMLElement;
  private hud: HTMLElement;
  private bars = new Map<string, HTMLElement>();
  private timeEl: HTMLElement;
  private metaEl: HTMLElement;
  private logEl: HTMLElement;
  private promptEl: HTMLElement;
  private promptLabel: HTMLElement;
  private overlay: HTMLElement;
  private toastEl: HTMLElement | null = null;
  private overlayCleanup: (() => void) | null = null;

  constructor(private game: Game) {
    this.root = document.querySelector<HTMLElement>('#ui')!;
    this.root.innerHTML = '';
    this.hud = el('div', 'hud');
    this.overlay = el('div', 'layer');

    const vitals = el('div', 'hud__vitals');
    for (const def of BARS) {
      const bar = el('div', `bar bar--${def.key}`);
      const label = el('span', 'bar__label');
      label.textContent = def.label;
      const track = el('div', 'bar__track');
      const fill = el('div', 'bar__fill');
      track.appendChild(fill);
      bar.append(label, track);
      vitals.appendChild(bar);
      this.bars.set(def.key, fill);
    }

    const clock = el('div', 'hud__clock');
    this.timeEl = el('div', 'hud__time mono');
    this.metaEl = el('div', 'hud__meta mono');
    clock.append(this.timeEl, this.metaEl);

    this.logEl = el('div', 'hud__log');

    this.promptEl = el('div', 'hud__prompt');
    const key = el('span', 'prompt__key');
    key.textContent = 'E';
    this.promptLabel = el('span', 'prompt__label');
    this.promptEl.append(key, this.promptLabel);

    this.hud.append(vitals, clock, this.logEl, this.promptEl);
    this.hud.classList.add('hidden');
    this.root.append(this.hud, this.overlay);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        this.toggleInventory();
      }
    });
  }

  // ————— HUD —————

  renderVitals(): void {
    const p = this.game.player;
    if (!p) return;
    for (const def of BARS) {
      const value = p.vitals.state[def.key];
      const fill = this.bars.get(def.key);
      if (!fill) continue;
      fill.style.width = `${Math.max(0, Math.min(100, value))}%`;
      const bar = fill.parentElement?.parentElement;
      bar?.classList.toggle('bar--low', value < def.low);
    }
  }

  renderTime(): void {
    const g = this.game;
    this.timeEl.textContent = g.clock.label;
    const temp = g.ambientC;
    const cold = temp < -20 ? 'hud__temp--cold' : '';
    this.metaEl.innerHTML = `день ${g.clock.day} · ${g.clock.phaseLabel} · <span class="${cold}">${formatTemperature(temp)}</span>`;
  }

  renderLog(): void {
    const entries = this.game.log.recent(6);
    this.logEl.innerHTML = '';
    for (const e of entries) {
      const line = el('div', `log-line log-line--${e.kind}`);
      line.textContent = e.text;
      this.logEl.appendChild(line);
    }
  }

  setSpot(spot: Spot | null): void {
    if (!spot) {
      this.promptEl.classList.remove('is-on');
      return;
    }
    this.promptEl.classList.add('is-on');
    this.promptLabel.textContent = spot.label;
  }

  toast(text: string): void {
    this.toastEl?.remove();
    const t = el('div', 'toast');
    t.textContent = text;
    this.root.appendChild(t);
    this.toastEl = t;
    window.setTimeout(() => {
      t.remove();
      if (this.toastEl === t) this.toastEl = null;
    }, 2200);
  }

  setHudVisible(visible: boolean): void {
    this.hud.classList.toggle('hidden', !visible);
  }

  // ————— экраны —————

  private clearOverlay(): void {
    this.overlayCleanup?.();
    this.overlayCleanup = null;
    this.overlay.innerHTML = '';
    this.overlay.style.pointerEvents = 'none';
  }

  showTitle(opts: TitleScreenOptions): void {
    this.clearOverlay();
    this.overlay.style.pointerEvents = 'auto';
    const screen = el('div', 'title-screen');
    const title = el('div', 'title-serif');
    title.textContent = 'ПАНЕЛЬ';
    const sub = el('div', 'title-screen__sub');
    sub.innerHTML = 'два дня<br />ядерная зима, панельный район';

    const buttons = el('div', 'title-screen__buttons');
    if (opts.onContinue) {
      const cont = el('button', 'title-screen__go title-screen__go--primary');
      cont.textContent = 'продолжить';
      cont.addEventListener('click', opts.onContinue);
      buttons.appendChild(cont);
      if (opts.continueHint) {
        const hint = el('div', 'title-screen__hint mono');
        hint.textContent = opts.continueHint;
        buttons.appendChild(hint);
      }
    }
    const go = el('button', 'title-screen__go');
    go.textContent = opts.onContinue ? 'начать заново' : 'начать';
    go.addEventListener('click', opts.onStart);
    buttons.appendChild(go);

    // версия и история изменений: тот же CHANGELOG.md, что лежит в репозитории
    const unseen = hasUnseenChanges();
    const foot = el('div', 'title-screen__foot');
    const version = el('span', 'title-screen__version mono');
    version.textContent = `v${CURRENT_VERSION}`;
    const changelog = el('button', 'changelog-link');
    changelog.textContent = unseen ? 'что нового' : 'история изменений';
    if (unseen) changelog.classList.add('changelog-link--new');
    changelog.addEventListener('click', () => this.showChangelog(() => this.showTitle(opts)));
    foot.append(version, changelog);

    screen.append(title, sub, buttons, foot);
    this.overlay.appendChild(screen);
  }

  /** Экран истории изменений; `back` возвращает туда, откуда его открыли. */
  showChangelog(back: () => void): void {
    this.clearOverlay();
    this.overlay.style.pointerEvents = 'auto';
    this.overlayCleanup = renderChangelog(this.overlay, { onBack: back });
  }

  showClassSelect(onPick: (c: CharacterDef) => void): void {
    this.clearOverlay();
    this.overlay.style.pointerEvents = 'auto';
    const wrap = el('div', 'pick');
    const head = el('div', 'pick__head');
    const h = el('h1');
    h.textContent = 'Кто ты был вчера';
    const hint = el('span');
    hint.textContent = 'профессия — это не класс, это то, что ты умеешь';
    head.append(h, hint);

    const grid = el('div', 'pick__grid');
    for (const c of CHARACTERS) {
      const card = el('button', 'card');
      const name = el('div', 'card__name');
      name.textContent = c.name;
      const age = el('div', 'card__age');
      age.textContent = `${c.age} · ${c.profession}`;
      const tag = el('div', 'card__tag');
      tag.textContent = c.tagline;
      const stats = el('div', 'card__age');
      stats.textContent = (Object.keys(c.stats) as Array<keyof typeof c.stats>)
        .map((k) => `${STAT_LABELS[k]} ${c.stats[k]}`)
        .join(' · ');
      const trait = el('div', 'card__trait');
      trait.innerHTML = `<b>${c.trait.name}</b>${c.trait.desc}`;
      card.append(name, age, tag, stats, trait);
      card.style.borderTop = `2px solid ${c.accent}`;
      card.addEventListener('click', () => onPick(c));
      grid.appendChild(card);
    }
    wrap.append(head, grid);
    this.overlay.appendChild(wrap);
  }

  showDialogue(view: DialogueView, onChoose: (id: string) => void): void {
    this.clearOverlay();
    this.overlay.style.pointerEvents = 'auto';
    const box = el('div', 'dialogue');
    const who = el('div', 'dialogue__who');
    who.textContent = view.who;
    const text = el('div', 'dialogue__text');
    text.textContent = view.text;
    const choices = el('div', 'dialogue__choices');
    for (const opt of view.options) {
      const btn = el('button', 'choice');
      btn.textContent = opt.text;
      if (opt.note) {
        const note = el('span', 'choice__note');
        note.textContent = opt.note;
        btn.appendChild(note);
      }
      btn.disabled = Boolean(opt.disabled);
      if (opt.disabled) btn.style.opacity = '0.35';
      btn.addEventListener('click', () => {
        this.clearOverlay();
        onChoose(opt.id);
      });
      choices.appendChild(btn);
    }
    box.append(who, text, choices);
    this.overlay.appendChild(box);
  }

  renderInventory(): void {
    const p = this.game.player;
    if (!p) return;
    this.clearOverlay();
    this.overlay.style.pointerEvents = 'auto';
    const wrap = el('div', 'inv');
    const panel = el('div', 'inv__panel');
    const head = el('div', 'inv__head');
    const title = el('h2');
    title.textContent = 'Рюкзак';
    const weight = el('div', 'hud__meta mono');
    weight.textContent = `${p.inventory.weight.toFixed(1)} / ${p.inventory.capacity.toFixed(0)} кг`;
    head.append(title, weight);

    for (const { def, count } of p.inventory.list()) {
      const row = el('div', 'inv__row');
      const nameWrap = el('div');
      const name = el('div', 'inv__name');
      name.textContent = `${def.name}${count > 1 ? ` ×${count}` : ''}`;
      const desc = el('div', 'inv__desc');
      desc.textContent = def.desc;
      nameWrap.append(name, desc);

      const use = el('button', 'inv__use');
      if (def.use) {
        use.textContent = def.verb ?? 'использовать';
        use.addEventListener('click', () => {
          const nameUsed = p.eat(def.id);
          if (nameUsed) {
            this.game.info(`${nameUsed} — использовано`);
            this.renderVitals();
            this.renderInventory();
          }
        });
      } else if (def.slot) {
        use.textContent = 'надеть';
        use.addEventListener('click', () => {
          if (p.inventory.equip(def.id)) {
            this.game.info(`Надето: ${def.name}`);
            this.renderVitals();
            this.renderInventory();
          }
        });
      } else {
        use.classList.add('hidden');
      }

      row.append(nameWrap, use);
      panel.appendChild(row);
    }

    wrap.appendChild(panel);
    this.overlay.appendChild(wrap);
  }

  toggleInventory(): void {
    if (this.game.phase !== 'playing') return;
    if (this.overlay.querySelector('.inv')) {
      this.clearOverlay();
      return;
    }
    document.exitPointerLock();
    this.renderInventory();
  }

  isInventoryOpen(): boolean {
    return Boolean(this.overlay.querySelector('.inv'));
  }

  closeOverlay(): void {
    this.clearOverlay();
  }

  /** Конец забега не по сюжету: замёрз, не удержался, не проснулся. */
  showDeath(cause: string, onRestart: () => void): void {
    this.clearOverlay();
    this.overlay.style.pointerEvents = 'auto';
    const wrap = el('div', 'finale finale--death');
    const title = el('div', 'finale__title');
    title.textContent = 'здесь всё и закончилось';
    const text = el('div', 'finale__text');
    text.textContent = cause;
    const stats = el('div', 'finale__stats');
    const g = this.game;
    stats.innerHTML = `<span>день ${g.clock.day}</span><span>${g.clock.label}</span><span>${formatTemperature(g.ambientC)}</span>`;
    const again = el('button', 'title-screen__go');
    again.textContent = 'ещё раз';
    again.addEventListener('click', onRestart);

    wrap.append(title, text, stats, again);
    this.overlay.appendChild(wrap);
  }

  showFinale(titleText: string, body: string, onRestart: () => void): void {
    this.clearOverlay();
    this.overlay.style.pointerEvents = 'auto';
    const wrap = el('div', 'finale');
    const title = el('div', 'finale__title');
    title.textContent = titleText;
    const text = el('div', 'finale__text');
    text.textContent = body;
    const stats = el('div', 'finale__stats');
    const g = this.game;
    stats.innerHTML = `<span>день ${g.clock.day}</span><span>${g.clock.phaseLabel}</span><span>${formatTemperature(g.ambientC)}</span>`;
    const again = el('button', 'title-screen__go');
    again.textContent = 'ещё раз';
    again.addEventListener('click', onRestart);

    const foot = el('div', 'finale__foot');
    const changelog = el('button', 'changelog-link');
    changelog.textContent = 'история изменений';
    changelog.addEventListener('click', () =>
      this.showChangelog(() => this.showFinale(titleText, body, onRestart)),
    );
    foot.appendChild(changelog);

    wrap.append(title, text, stats, again, foot);
    this.overlay.appendChild(wrap);
  }

  onPhase(phase: GamePhase): void {
    this.setHudVisible(phase === 'playing' || phase === 'dialogue' || phase === 'combat');
    if (phase === 'playing') this.clearOverlay();
  }

  itemLabel(id: string): string {
    return item(id).name;
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
