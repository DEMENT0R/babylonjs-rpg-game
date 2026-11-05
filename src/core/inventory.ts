import { item, type EquipSlot, type ItemDef } from './items';

export interface Stack {
  id: string;
  count: number;
}

export interface InventorySnapshot {
  stacks: Stack[];
  equipped: Partial<Record<EquipSlot, string>>;
  capacityBonus: number;
}

/**
 * Базовый рюкзак. Двенадцать, а не девять: с тех пор как дом надо топить,
 * дрова должны помещаться в один заход вместе с едой, а не вместо неё.
 */
const BASE_CAPACITY = 12;
const BACKPACK_BONUS = 9;

/** Инвентарь: вес, стопки, слоты. Никакой магии — всё через предметы. */
export class Inventory {
  stacks: Stack[] = [];
  equipped: Partial<Record<EquipSlot, string>> = {};
  capacityBonus = 0;

  get capacity(): number {
    return BASE_CAPACITY + this.capacityBonus;
  }

  get weight(): number {
    let w = 0;
    for (const s of this.stacks) w += item(s.id).weight * s.count;
    for (const id of Object.values(this.equipped)) {
      if (id) w += item(id).weight;
    }
    return Math.round(w * 100) / 100;
  }

  get overloaded(): boolean {
    return this.weight > this.capacity;
  }

  count(id: string): number {
    return this.stacks.find((s) => s.id === id)?.count ?? 0;
  }

  has(id: string, n = 1): boolean {
    return this.count(id) >= n;
  }

  add(id: string, n = 1): boolean {
    const def = item(id);
    if (this.weight + def.weight * n > this.capacity + 0.001) return false;
    if (def.stackable) {
      const stack = this.stacks.find((s) => s.id === id);
      if (stack) stack.count += n;
      else this.stacks.push({ id, count: n });
    } else {
      for (let i = 0; i < n; i++) this.stacks.push({ id, count: 1 });
    }
    return true;
  }

  remove(id: string, n = 1): boolean {
    const idx = this.stacks.findIndex((s) => s.id === id);
    if (idx < 0) return false;
    const stack = this.stacks[idx]!;
    if (stack.count < n) return false;
    stack.count -= n;
    if (stack.count <= 0) this.stacks.splice(idx, 1);
    return true;
  }

  equip(id: string): boolean {
    const def = item(id);
    if (!def.slot) return false;
    const current = this.equipped[def.slot];
    if (current === id) return false;
    if (!this.remove(id, 1)) return false;
    if (current) {
      // снятое возвращается в рюкзак; если места нет — на пол, но здесь просто кладём
      this.stacks.push({ id: current, count: 1 });
    }
    this.equipped[def.slot] = id;
    if (id === 'backpack') this.capacityBonus = BACKPACK_BONUS;
    return true;
  }

  unequip(slot: EquipSlot): boolean {
    const current = this.equipped[slot];
    if (!current) return false;
    if (current === 'backpack') {
      // снять рюкзак с перегрузом нельзя: вещи некуда девать
      const withoutBackpack = this.capacity - BACKPACK_BONUS;
      const carried = this.weight - item('backpack').weight;
      if (carried > withoutBackpack) return false;
      this.capacityBonus = 0;
    }
    delete this.equipped[slot];
    this.stacks.push({ id: current, count: 1 });
    return true;
  }

  /** Суммарное утепление надетого. */
  get insulation(): number {
    let sum = 0;
    for (const id of Object.values(this.equipped)) {
      if (id) sum += item(id).insulation ?? 0;
    }
    return sum;
  }

  /** Чем драться: самый тяжёлый из надетого/взятый в руку. */
  bestWeapon(): ItemDef | null {
    let best: ItemDef | null = null;
    let bestDamage = -1;
    for (const s of this.stacks) {
      const def = item(s.id);
      if (!def.combat) continue;
      if (def.combat.damage > bestDamage) {
        best = def;
        bestDamage = def.combat.damage;
      }
    }
    return best;
  }

  /** Список для интерфейса: сгруппированный и стабильный. */
  list(): Array<{ def: ItemDef; count: number }> {
    return this.stacks
      .slice()
      .sort((a, b) => item(a.id).name.localeCompare(item(b.id).name, 'ru'))
      .map((s) => ({ def: item(s.id), count: s.count }));
  }

  snapshot(): InventorySnapshot {
    return {
      stacks: this.stacks.map((s) => ({ ...s })),
      equipped: { ...this.equipped },
      capacityBonus: this.capacityBonus,
    };
  }

  static restore(snap: InventorySnapshot): Inventory {
    const inv = new Inventory();
    inv.stacks = snap.stacks.map((s) => ({ ...s }));
    inv.equipped = { ...snap.equipped };
    inv.capacityBonus = snap.capacityBonus;
    return inv;
  }
}
