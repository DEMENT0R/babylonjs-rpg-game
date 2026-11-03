import type { Combat } from '../game/combat';
import type { Game } from '../game/game';

/** Экран боя: тот же мир на фоне, но время остановлено. */
export class CombatView {
  private node: HTMLElement | null = null;

  constructor(private game: Game) {}

  show(combat: Combat): void {
    this.hide();
    const root = document.querySelector<HTMLElement>('#ui')!;
    const wrap = document.createElement('div');
    wrap.className = 'combat';

    const hud = document.createElement('div');
    hud.className = 'combat__hud';
    const name = document.createElement('div');
    name.className = 'combat__enemy';
    name.textContent = combat.enemy.name;
    const hp = document.createElement('div');
    hp.className = 'combat__hp';
    const hpFill = document.createElement('div');
    hpFill.className = 'combat__hp-fill';
    hpFill.style.width = `${(combat.enemyHp / combat.enemy.hp) * 100}%`;
    hp.appendChild(hpFill);
    const dist = document.createElement('div');
    dist.className = 'combat__dist mono';
    dist.textContent = `дистанция ${combat.distance.toFixed(1)} м · твоё здоровье ${Math.round(combat.playerHealth)}`;
    hud.append(name, hp, dist);

    const panel = document.createElement('div');
    panel.className = 'combat__panel';

    const log = document.createElement('div');
    log.className = 'combat__log';
    for (const line of combat.lines.slice(-5)) {
      const row = document.createElement('div');
      row.textContent = line;
      log.appendChild(row);
    }

    const ap = document.createElement('div');
    ap.className = 'combat__ap';
    const apLabel = document.createElement('span');
    apLabel.textContent = 'действия';
    ap.appendChild(apLabel);
    for (let i = 0; i < combat.maxAp; i++) {
      const pip = document.createElement('span');
      pip.className = `ap-pip${i >= combat.ap ? ' ap-pip--spent' : ''}`;
      ap.appendChild(pip);
    }

    const actions = document.createElement('div');
    actions.className = 'combat__actions';
    for (const a of combat.actions()) {
      const btn = document.createElement('button');
      btn.className = 'act';
      btn.disabled = !a.enabled;
      btn.innerHTML = `${a.label}<small>${a.hint}</small>`;
      btn.addEventListener('click', () => {
        combat.act(a.id);
        if (combat.over) return;
        this.show(combat);
      });
      actions.appendChild(btn);
    }

    panel.append(log, ap, actions);
    wrap.append(hud, panel);
    root.appendChild(wrap);
    this.node = wrap;
  }

  hide(): void {
    this.node?.remove();
    this.node = null;
  }
}
