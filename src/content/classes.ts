import type { EquipSlot } from '../core/items';

export type StatKey = 'might' | 'agility' | 'wits' | 'will';

export const STAT_LABELS: Record<StatKey, string> = {
  might: 'Сила',
  agility: 'Ловкость',
  wits: 'Смекалка',
  will: 'Воля',
};

export interface CharacterDef {
  id: string;
  name: string;
  age: number;
  profession: string;
  tagline: string;
  bio: string;
  stats: Record<StatKey, number>;
  trait: { name: string; desc: string };
  startItems: Array<[string, number]>;
  startEquipped: Partial<Record<EquipSlot, string>>;
  accent: string;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'irina',
    name: 'Ирина Соколова',
    age: 34,
    profession: 'фельдшер скорой',
    tagline: 'знает, как выглядит человек, который не доживёт до утра',
    bio: 'Двенадцать лет на подстанции. Привыкла, что чужие жизни заканчиваются на её смене, и научилась не думать об этом до дома. Дом — панелька на девятом этаже, лифт сломан с осени.',
    stats: { might: 3, agility: 3, wits: 5, will: 4 },
    trait: {
      name: 'Триаж',
      desc: 'Бинт в бою не тратит очко действия. Ты всегда знаешь, кто ещё дышит.',
    },
    startItems: [
      ['medkit', 1],
      ['bandage', 2],
      ['pills', 1],
      ['flashlight', 1],
      ['keys', 1],
      ['coat_padded', 1],
    ],
    startEquipped: { outer: 'coat_padded', feet: 'boots_winter', head: 'hat_knit' },
    accent: '#8ea8a0',
  },
  {
    id: 'dima',
    name: 'Дима Крылов',
    age: 27,
    profession: 'программист',
    tagline: 'умеет всё, что работает от розетки. Розеток больше нет',
    bio: 'Писал бэкенд для сервиса доставки, работал из дома и почти не выходил из него. В холодильнике было три банки энергетика и половина сыра. Теперь это стратегический запас.',
    stats: { might: 2, agility: 4, wits: 6, will: 2 },
    trait: {
      name: 'Схема',
      desc: 'Вскрывает электронику и замки. Один раз за день может «перезагрузить» сломанное.',
    },
    startItems: [
      ['flashlight', 1],
      ['batteries', 2],
      ['knife', 1],
      ['keys', 1],
      ['cigarettes', 1],
      ['coat_padded', 1],
    ],
    startEquipped: { outer: 'coat_padded', feet: 'slippers', head: 'hat_knit' },
    accent: '#7f93b5',
  },
  {
    id: 'valya',
    name: 'Валентина Гуськова',
    age: 41,
    profession: 'учитель литературы',
    tagline: 'двадцать лет объясняет подросткам, зачем читать про чужую боль',
    bio: 'Школа за углом, пятый «Б» — самый громкий. Дома — муж, который уехал в командировку в область и перестал отвечать вчера в шесть вечера. Учебники стоят ровно, как будто это ещё важно.',
    stats: { might: 2, agility: 2, wits: 5, will: 6 },
    trait: {
      name: 'Слово',
      desc: 'Тебя слушают дольше, чем других. В диалогах открыты варианты, которых нет у остальных.',
    },
    startItems: [
      ['chay', 1],
      ['bread', 1],
      ['photo', 1],
      ['matches', 1],
      ['keys', 1],
      ['coat_old', 1],
    ],
    startEquipped: { outer: 'coat_old', feet: 'boots_winter', head: 'scarf' },
    accent: '#b5a17f',
  },
  {
    id: 'olya',
    name: 'Оля Морозова',
    age: 36,
    profession: 'в декрете',
    tagline: 'дети у бабушки. Ты знаешь этот двор лучше участкового',
    bio: 'Год без работы и без сна. Знаешь, в каком подъезде не закрывается дверь, у кого есть генератор и кто держит соль в гараже. До садика — семь минут пешком, если по прямой.',
    stats: { might: 3, agility: 3, wits: 4, will: 5 },
    trait: {
      name: 'Запас',
      desc: 'Вмещаешь больше, чем кажется: +4 кг к переносимому весу. Консервы и вода ценнее.',
    },
    startItems: [
      ['tushonka', 2],
      ['matches', 1],
      ['candle', 2],
      ['water_bottle', 1],
      ['sugar', 1],
      ['keys', 1],
      ['coat_padded', 1],
    ],
    startEquipped: { outer: 'coat_padded', feet: 'boots_winter', head: 'hat_knit' },
    accent: '#b58f8f',
  },
  {
    id: 'tolya',
    name: 'Толя Ершов',
    age: 44,
    profession: 'сантехник',
    tagline: 'вскроет любую дверь и объяснит, почему тепло ушло не просто так',
    bio: 'Двадцать лет в ЖЭКе. В подвале знает каждый вентиль, в доме — каждый стояк. Руки помнят работу даже сейчас, когда работы больше нет ни у кого.',
    stats: { might: 6, agility: 2, wits: 3, will: 4 },
    trait: {
      name: 'Руки',
      desc: 'Теплее на 4°C в любой одежде: ты всегда находишь, чем заткнуть щель. Вскрывает двери и щитки.',
    },
    startItems: [
      ['crowbar', 1],
      ['rabochaya_roba', 1],
      ['matches', 1],
      ['cigarettes', 1],
      ['keys', 1],
    ],
    startEquipped: { outer: 'rabochaya_roba', feet: 'boots_winter', head: 'hat_knit' },
    accent: '#a08a6a',
  },
];

export function characterById(id: string): CharacterDef {
  const found = CHARACTERS.find((c) => c.id === id);
  if (!found) throw new Error(`Неизвестный персонаж: ${id}`);
  return found;
}
