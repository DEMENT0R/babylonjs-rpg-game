import type { CharacterDef, StatKey } from '../content/classes';
import { characterById } from '../content/classes';
import { item } from './items';
import { Inventory, type InventorySnapshot } from './inventory';
import { Vitals, type VitalsState } from './vitals';

export interface PlayerSnapshot {
  charId: string;
  vitals: VitalsState;
  inventory: InventorySnapshot;
}

/** Производные боевые числа: считаются из характеристик, а не хранятся. */
export interface CombatStats {
  maxAp: number;
  initiative: number;
  accuracy: number;
  damageBonus: number;
  dodge: number;
}

export class Player {
  readonly def: CharacterDef;
  vitals: Vitals;
  inventory: Inventory;

  constructor(def: CharacterDef, init?: { vitals?: Partial<VitalsState>; inventory?: Inventory }) {
    this.def = def;
    this.vitals = new Vitals(init?.vitals);
    this.inventory = init?.inventory ?? new Inventory();
  }

  static create(charId: string): Player {
    const def = characterById(charId);
    const p = new Player(def);
    for (const [id, n] of def.startItems) p.inventory.add(id, n);
    // надетое может не входить в стартовый набор — тогда выдаём и надеваем
    for (const id of Object.values(def.startEquipped)) {
      if (!id) continue;
      if (!p.inventory.has(id)) p.inventory.add(id, 1);
      p.inventory.equip(id);
    }
    if (def.id === 'olya') p.inventory.capacityBonus += 4;
    return p;
  }

  get stats(): Record<StatKey, number> {
    return this.def.stats;
  }

  /** Утепление: одежда + прибавка персонажа. */
  get insulation(): number {
    const traitBonus = this.def.id === 'tolya' ? 4 : 0;
    return this.inventory.insulation + traitBonus;
  }

  get combat(): CombatStats {
    const s = this.stats;
    const weapon = this.inventory.bestWeapon();
    const weaponWeight = weapon?.weight ?? 0;
    return {
      maxAp: 2 + (s.agility >= 6 ? 1 : 0),
      initiative: s.agility + s.wits * 0.5,
      accuracy: 0.42 + s.agility * 0.055 + s.wits * 0.02,
      damageBonus: s.might * 0.9 + weaponWeight * 1.5,
      dodge: 0.08 + s.agility * 0.035,
    };
  }

  /** Насколько персонаж тяжёл на подъём: перегруз бьёт по скорости. */
  get encumbrance(): number {
    const over = this.inventory.weight - this.inventory.capacity;
    return over > 0 ? Math.min(over / 6, 1) : 0;
  }

  weaponName(): string {
    return this.inventory.bestWeapon()?.name ?? 'руки';
  }

  /** Потратить тепло или получить его от предмета. */
  eat(id: string): string | null {
    const def = item(id);
    if (!def.use) return null;
    if (!this.inventory.has(id)) return null;
    this.inventory.remove(id, 1);
    const s = this.vitals.state;
    const u = def.use;
    if (u.food) s.hunger = Math.min(100, s.hunger + u.food);
    if (u.water) s.thirst = Math.min(100, s.thirst + u.water);
    if (u.warmth) s.warmth = Math.min(100, s.warmth + u.warmth);
    if (u.sanity) s.sanity = Math.min(100, s.sanity + u.sanity);
    if (u.health) s.health = Math.min(100, s.health + u.health);
    if (u.energy) s.energy = Math.min(100, s.energy + u.energy);
    return def.name;
  }

  snapshot(): PlayerSnapshot {
    return {
      charId: this.def.id,
      vitals: { ...this.vitals.state },
      inventory: this.inventory.snapshot(),
    };
  }

  static restore(snap: PlayerSnapshot): Player {
    return new Player(characterById(snap.charId), {
      vitals: snap.vitals,
      inventory: Inventory.restore(snap.inventory),
    });
  }
}
