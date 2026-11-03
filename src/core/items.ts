/** Каталог предметов. Всё, что можно поднять, — с весом, пользой и ценой. */

export type ItemCategory = 'wear' | 'food' | 'med' | 'light' | 'tool' | 'weapon' | 'misc';
export type EquipSlot = 'outer' | 'head' | 'hands' | 'feet' | 'back';
export type ItemVerb = 'съесть' | 'выпить' | 'надеть' | 'использовать' | 'зажечь' | 'прочитать';

export interface ItemUse {
  food?: number;
  water?: number;
  warmth?: number;
  sanity?: number;
  health?: number;
  energy?: number;
  /** Требует ли источник огня (спички, зажигалка). */
  needsFire?: boolean;
}

export interface CombatProfile {
  damage: number;
  reach: number;
  /** Стоимость удара в очках действия. */
  ap: number;
}

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  weight: number;
  category: ItemCategory;
  stackable?: boolean;
  slot?: EquipSlot;
  insulation?: number;
  use?: ItemUse;
  verb?: ItemVerb;
  combat?: CombatProfile;
  /** Полезно для сюжета или как валюта. */
  valuable?: number;
  once?: boolean;
}

const catalog: ItemDef[] = [
  // — одежда —
  {
    id: 'coat_padded',
    name: 'Пуховик',
    desc: 'Чёрный, с капюшоном, куплен три зимы назад. Держит тепло.',
    weight: 2.4,
    category: 'wear',
    slot: 'outer',
    insulation: 11,
    verb: 'надеть',
  },
  {
    id: 'coat_old',
    name: 'Старое пальто',
    desc: 'Драповое, тяжёлое, с оторванной пуговицей. Греет хуже, чем кажется.',
    weight: 2.9,
    category: 'wear',
    slot: 'outer',
    insulation: 6,
    verb: 'надеть',
  },
  {
    id: 'hat_knit',
    name: 'Шапка',
    desc: 'Синтетическая, колючая. Уши в ней мёрзнут меньше, чем без неё.',
    weight: 0.2,
    category: 'wear',
    slot: 'head',
    insulation: 3,
    verb: 'надеть',
  },
  {
    id: 'scarf',
    name: 'Шарф',
    desc: 'Кто-то вязал его вручную и часто ошибалась.',
    weight: 0.3,
    category: 'wear',
    slot: 'head',
    insulation: 2,
    verb: 'надеть',
  },
  {
    id: 'gloves',
    name: 'Перчатки',
    desc: 'Шерстяные. Пальцы в них работают примерно как пальцы.',
    weight: 0.15,
    category: 'wear',
    slot: 'hands',
    insulation: 2,
    verb: 'надеть',
  },
  {
    id: 'boots_winter',
    name: 'Зимние ботинки',
    desc: 'Тяжёлые, на толстой подошве. Снег в них не заходит.',
    weight: 1.6,
    category: 'wear',
    slot: 'feet',
    insulation: 6,
    verb: 'надеть',
  },
  {
    id: 'slippers',
    name: 'Тапочки',
    desc: 'Домашние. Для мира снаружи не годятся совсем.',
    weight: 0.3,
    category: 'wear',
    slot: 'feet',
    insulation: 1,
    verb: 'надеть',
  },
  {
    id: 'backpack',
    name: 'Рюкзак',
    desc: 'Городской, с ноутбуком внутри. Ноутбук можно выложить.',
    weight: 0.9,
    category: 'wear',
    slot: 'back',
    verb: 'надеть',
  },
  {
    id: 'rabochaya_roba',
    name: 'Рабочая роба',
    desc: 'Ватные штаны и куртка. Пахнет машинным маслом. Не красиво — тепло.',
    weight: 3.2,
    category: 'wear',
    slot: 'outer',
    insulation: 9,
    verb: 'надеть',
  },

  // — еда —
  {
    id: 'tushonka',
    name: 'Тушёнка',
    desc: 'Банка без этикетки. Говядина, судя по цене — не совсем.',
    weight: 0.4,
    category: 'food',
    stackable: true,
    use: { food: 52, water: 4, sanity: 2 },
    verb: 'съесть',
    valuable: 3,
  },
  {
    id: 'bread',
    name: 'Хлеб',
    desc: 'Полбуханки, уже чёрствый. Всё ещё лучше, чем ничего.',
    weight: 0.35,
    category: 'food',
    use: { food: 24, sanity: 1 },
    verb: 'съесть',
  },
  {
    id: 'galety',
    name: 'Галеты',
    desc: 'Из армейского НЗ. Вкус картона, калорий — как у обеда.',
    weight: 0.3,
    category: 'food',
    stackable: true,
    use: { food: 20 },
    verb: 'съесть',
  },
  {
    id: 'sugar',
    name: 'Сахар',
    desc: 'Полпачки. В холодном мире это почти валюта.',
    weight: 0.25,
    category: 'food',
    stackable: true,
    use: { food: 10, sanity: 3, energy: 4 },
    verb: 'съесть',
    valuable: 2,
  },
  {
    id: 'chay',
    name: 'Чай в пакетиках',
    desc: 'Пять пакетиков. Нужен кипяток, но можно и так.',
    weight: 0.05,
    category: 'food',
    stackable: true,
    use: { water: 12, warmth: 5, sanity: 4 },
    verb: 'выпить',
  },
  {
    id: 'water_bottle',
    name: 'Бутылка воды',
    desc: 'Полтора литра. Замёрзла почти до льда — греть под курткой.',
    weight: 1.1,
    category: 'food',
    use: { water: 58 },
    verb: 'выпить',
    valuable: 2,
  },
  {
    id: 'snow',
    name: 'Горсть снега',
    desc: 'Вода. И минус два градуса тела за каждый глоток.',
    weight: 0,
    category: 'food',
    use: { water: 14, warmth: -3 },
    verb: 'съесть',
  },
  {
    id: 'vodka',
    name: 'Водка',
    desc: 'Согревает на двадцать минут и обманывает на сутки.',
    weight: 0.5,
    category: 'food',
    stackable: true,
    use: { warmth: 9, sanity: 9, health: -2, water: -3 },
    verb: 'выпить',
    valuable: 4,
  },

  // — медицина —
  {
    id: 'bandage',
    name: 'Бинт',
    desc: 'Стерильный, в бумажке. Ещё не распечатан.',
    weight: 0.05,
    category: 'med',
    stackable: true,
    use: { health: 14 },
    verb: 'использовать',
  },
  {
    id: 'pills',
    name: 'Обезболивающее',
    desc: 'Просрочено на два года. Работает.',
    weight: 0.05,
    category: 'med',
    stackable: true,
    use: { health: 9, sanity: 5 },
    verb: 'использовать',
  },
  {
    id: 'medkit',
    name: 'Аптечка',
    desc: 'Сумка с красным крестом. Внутри — почти всё, что нужно.',
    weight: 1.2,
    category: 'med',
    use: { health: 38 },
    verb: 'использовать',
    valuable: 5,
  },

  // — свет и огонь —
  {
    id: 'matches',
    name: 'Спички',
    desc: 'Коробок. Половина отсырела, но сухие ещё есть.',
    weight: 0.03,
    category: 'light',
    stackable: true,
    use: { warmth: 2 },
    verb: 'зажечь',
    valuable: 2,
  },
  {
    id: 'lighter',
    name: 'Зажигалка',
    desc: 'Газовая, с рекламой шиномонтажа. Щёлкает с третьего раза.',
    weight: 0.05,
    category: 'light',
    use: { warmth: 2 },
    verb: 'зажечь',
  },
  {
    id: 'candle',
    name: 'Свеча',
    desc: 'Хозяйственная, толстая. Часов на шесть.',
    weight: 0.15,
    category: 'light',
    stackable: true,
    use: { warmth: 6, sanity: 4, needsFire: true },
    verb: 'зажечь',
  },
  {
    id: 'flashlight',
    name: 'Фонарик',
    desc: 'Китайский, на трёх батарейках. Светит как надежда — то есть слабо.',
    weight: 0.25,
    category: 'light',
    use: { sanity: 1 },
    verb: 'использовать',
  },
  {
    id: 'batteries',
    name: 'Батарейки',
    desc: 'Две штуки, пальчиковые. В темноте это дороже денег.',
    weight: 0.1,
    category: 'light',
    stackable: true,
    valuable: 3,
  },

  // — инструменты и оружие —
  {
    id: 'crowbar',
    name: 'Монтировка',
    desc: 'Полметра стали. Открывает двери и закрывает вопросы.',
    weight: 1.8,
    category: 'weapon',
    combat: { damage: 17, reach: 1.5, ap: 1 },
    valuable: 3,
  },
  {
    id: 'knife',
    name: 'Кухонный нож',
    desc: 'Тяжёлый, с деревянной ручкой. Точили давно.',
    weight: 0.3,
    category: 'weapon',
    combat: { damage: 11, reach: 1.0, ap: 1 },
  },
  {
    id: 'hammer',
    name: 'Молоток',
    desc: 'Инструмент, а не оружие. Но разница быстро стирается.',
    weight: 0.7,
    category: 'weapon',
    combat: { damage: 13, reach: 1.2, ap: 1 },
  },
  {
    id: 'keys',
    name: 'Ключи',
    desc: 'Связка: квартира, подъезд, гараж. Последнее, что осталось от порядка.',
    weight: 0.1,
    category: 'tool',
    valuable: 2,
  },
  {
    id: 'radio',
    name: 'Радиоприёмник',
    desc: 'Старый, на батарейках. Если что-то ещё вещает — услышишь.',
    weight: 0.8,
    category: 'tool',
  },
  {
    id: 'photo',
    name: 'Фотография',
    desc: 'Лето, дача, все смеются. Ты не помнишь, кто снимал.',
    weight: 0.01,
    category: 'misc',
    use: { sanity: 12 },
    verb: 'прочитать',
    once: true,
  },
  {
    id: 'cigarettes',
    name: 'Сигареты',
    desc: 'Полпачки. Обменный курс в таких местах — один к трём.',
    weight: 0.1,
    category: 'misc',
    stackable: true,
    use: { sanity: 6, health: -1 },
    verb: 'использовать',
    valuable: 3,
  },
];

const byId = new Map<string, ItemDef>(catalog.map((it) => [it.id, it]));

export function item(id: string): ItemDef {
  const def = byId.get(id);
  if (!def) throw new Error(`Неизвестный предмет: ${id}`);
  return def;
}

export function allItems(): readonly ItemDef[] {
  return catalog;
}

export function itemName(id: string): string {
  return byId.get(id)?.name ?? id;
}
