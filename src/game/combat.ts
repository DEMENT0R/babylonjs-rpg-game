import type { Game } from './game';

export interface EnemyDef {
  id: string;
  name: string;
  line: string;
  hp: number;
  damage: [number, number];
  accuracy: number;
  reach: number;
  /** Что происходит после победы. */
  defeated?: string;
}

export type CombatActionId = 'strike' | 'approach' | 'retreat' | 'guard' | 'flee';

export interface CombatAction {
  id: CombatActionId;
  label: string;
  hint: string;
  cost: number;
  enabled: boolean;
}

/** Бой заморожен: мир не идёт, пока ты выбираешь. Ход — это два действия. */
export class Combat {
  readonly enemy: EnemyDef;
  enemyHp: number;
  distance = 2.4;
  ap = 2;
  guarding = false;
  over = false;
  outcome: 'win' | 'lose' | 'fled' | null = null;
  lines: string[] = [];

  constructor(
    private game: Game,
    enemy: EnemyDef,
    private onFinish: (outcome: 'win' | 'lose' | 'fled') => void,
  ) {
    this.enemy = enemy;
    this.enemyHp = enemy.hp;
    this.ap = this.maxAp;
    this.lines.push(`${enemy.name}: «${enemy.line}»`);
  }

  get maxAp(): number {
    return this.game.player?.combat.maxAp ?? 2;
  }

  get playerHealth(): number {
    return this.game.player?.vitals.state.health ?? 0;
  }

  get weaponReach(): number {
    return this.game.player?.inventory.bestWeapon()?.combat?.reach ?? 1.1;
  }

  private get weaponDamage(): number {
    const p = this.game.player;
    if (!p) return 4;
    const weapon = p.inventory.bestWeapon();
    return (weapon?.combat?.damage ?? 5) + p.combat.damageBonus;
  }

  actions(): CombatAction[] {
    const canReach = this.distance <= this.weaponReach + 0.15;
    return [
      {
        id: 'strike',
        label: 'Ударить',
        hint: canReach ? 'в пределах вытянутой руки' : 'слишком далеко',
        cost: 1,
        enabled: canReach && this.ap >= 1,
      },
      {
        id: 'approach',
        label: 'Шагнуть вперёд',
        hint: 'сократить дистанцию',
        cost: 1,
        enabled: this.distance > 1.0 && this.ap >= 1,
      },
      {
        id: 'retreat',
        label: 'Отступить',
        hint: 'увеличить дистанцию',
        cost: 1,
        enabled: this.ap >= 1,
      },
      {
        id: 'guard',
        label: 'Закрыться',
        hint: 'уклониться от следующего удара',
        cost: 1,
        enabled: this.ap >= 1,
      },
      {
        id: 'flee',
        label: 'Бежать',
        hint: this.distance > 2.6 ? 'есть шанс' : 'он слишком близко',
        cost: 2,
        enabled: this.ap >= 2,
      },
    ];
  }

  act(id: CombatActionId): void {
    if (this.over) return;
    const action = this.actions().find((a) => a.id === id);
    if (!action || !action.enabled) return;

    switch (id) {
      case 'strike':
        this.ap -= 1;
        this.resolveStrike();
        break;
      case 'approach':
        this.ap -= 1;
        this.distance = Math.max(0.9, this.distance - 1.1);
        this.lines.push('Ты делаешь шаг. Снег скрипит под подошвой.');
        break;
      case 'retreat':
        this.ap -= 1;
        this.distance = Math.min(6, this.distance + 1.1);
        this.lines.push('Ты отступаешь, не отводя взгляда.');
        break;
      case 'guard':
        this.ap -= 1;
        this.guarding = true;
        this.lines.push('Ты подбираешься и закрываешься.');
        break;
      case 'flee':
        this.ap -= 2;
        this.lines.push('Ты разворачиваешься и идёшь прочь.');
        this.finish('fled');
        return;
    }

    if (this.over) return;

    if (this.ap <= 0) {
      this.enemyTurn();
    }
    if (!this.over) this.trimLines();
  }

  private resolveStrike(): void {
    const p = this.game.player;
    if (!p) return;
    const accuracy = p.combat.accuracy - this.distance * 0.045;
    if (Math.random() > accuracy + 0.25) {
      this.lines.push('Ты бьёшь — и попадаешь в пустоту. Он успевает отшатнуться.');
      return;
    }
    const variance = 0.8 + Math.random() * 0.45;
    const dmg = Math.round(this.weaponDamage * variance);
    this.enemyHp = Math.max(0, this.enemyHp - dmg);
    const weapon = p.inventory.bestWeapon()?.name ?? 'кулак';
    this.lines.push(`${weapon}: попадание. ${dmg} урона.`);
    this.game.renderer.shake(0.03);
    this.game.sfx?.strike();
    if (this.enemyHp <= 0) this.finish('win');
  }

  private enemyTurn(): void {
    this.guarding = false;
    if (this.enemyHp <= 0) return;

    if (this.distance > this.enemy.reach) {
      this.distance = Math.max(this.enemy.reach, this.distance - 1.0);
      this.lines.push(`${this.enemy.name} подходит ближе.`);
    } else {
      const hit = Math.random() < this.enemy.accuracy;
      if (!hit) {
        this.lines.push(`${this.enemy.name} бьёт. Ты успеваешь уйти.`);
      } else {
        const [lo, hi] = this.enemy.damage;
        const dmg = Math.round(lo + Math.random() * (hi - lo));
        this.game.player?.vitals.damage(dmg);
        this.lines.push(`${this.enemy.name} бьёт. ${dmg} урона.`);
        this.game.renderer.shake(0.06);
        this.game.sfx?.hurt();
        if (this.playerHealth <= 0) {
          this.finish('lose');
          return;
        }
      }
    }
    this.ap = this.maxAp;
    this.game.events.onVitals();
  }

  private trimLines(): void {
    if (this.lines.length > 7) this.lines = this.lines.slice(-7);
  }

  private finish(outcome: 'win' | 'lose' | 'fled'): void {
    this.over = true;
    this.outcome = outcome;
    this.onFinish(outcome);
  }
}
