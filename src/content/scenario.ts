import type { Game } from '../game/game';
import { Combat, type EnemyDef } from '../game/combat';
import { CombatView } from '../ui/combatview';
import type { DialogueOption, UI } from '../ui/ui';
import type { Spot } from '../render/world/level';
import { item } from '../core/items';
import { formatTemperature } from '../core/clock';
import { clearSave } from '../core/save';

const VALERA: EnemyDef = {
  id: 'valera',
  name: 'Валера с третьего',
  line: 'Ты чего, сдурел? Я же по-хорошему!',
  hp: 44,
  damage: [6, 11],
  accuracy: 0.5,
  reach: 1.5,
};

const LOOTER: EnemyDef = {
  id: 'looter',
  name: 'Человек у полки',
  line: 'Не подходи. Я предупредил.',
  hp: 52,
  damage: [8, 14],
  accuracy: 0.55,
  reach: 1.6,
};

/**
 * Сценарий первого дня. Вся проза — здесь.
 * Геометрия ничего не знает о смысле: она просто стоит и ждёт.
 */
export class Scenario {
  private combatView: CombatView;

  constructor(
    private game: Game,
    private ui: UI,
  ) {
    this.combatView = new CombatView(game);
  }

  /** Первые секунды игры: до того, как игрок понял, что случилось. */
  intro(): void {
    const g = this.game;
    const p = g.player;
    if (!p) return;
    g.say('07:42. Свет погас ночью, и ты не слышал, как именно.');
    g.say(`Ты — ${p.def.name.split(' ')[0]}, ${p.def.profession}. Вчера это ещё что-то значило.`);
    g.say('Отопление не работает. В комнате видно дыхание.');
    g.say('Телефон разряжен и не ищет сеть уже вторые сутки. Ты думал, что дело в вышке.');
    g.info('Осмотрись. E — взаимодействие, Tab — рюкзак.');
  }

  handle(spot: Spot): void {
    switch (spot.id) {
      // ————— квартира —————
      case 'flat.window':
        this.windowView();
        break;
      case 'flat.tv':
        this.game.spendMinutes(2);
        this.game.say('По всем каналам серая рябь. На одном диктор без звука шевелит губами — будто извиняется.');
        break;
      case 'flat.bed':
        this.game.say('Спать днём — проснуться к темноте. Сейчас не время.');
        break;
      case 'flat.stove':
        this.stove();
        break;
      case 'flat.wardrobe':
        this.loot('flat.wardrobe', [['hammer', 1]], 'Ящик с инструментами. Молоток тяжёлый и честный.');
        break;
      case 'flat.hall-wardrobe':
        this.loot(
          'flat.hall-wardrobe',
          [['scarf', 1], ['gloves', 1]],
          'Одежда развешана по сезонам. Ты берёшь то, в чём не стыдно не вернуться.',
        );
        break;
      case 'flat.fridge':
        this.loot(
          'flat.fridge',
          [['tushonka', 1], ['bread', 1], ['water_bottle', 1]],
          'Холодильник отключился ночью и не успел испортиться. Уже что-то.',
        );
        break;
      case 'flat.table':
        this.loot('flat.table', [['matches', 1], ['candle', 2]], 'В ящике стола — спички и две свечи. Мелочь, которая теперь всё.');
        break;
      case 'flat.kitchen-table':
        this.loot('flat.kitchen-table', [['chay', 1], ['sugar', 1]], 'Чай и сахар. Сахар в таком холоде — почти валюта.');
        break;
      case 'flat.trellis':
        this.loot('flat.trellis', [['keys', 1], ['cigarettes', 1]], 'Ключи на месте. Это единственное, что сегодня на месте.');
        break;
      case 'flat.door':
        this.exitToStreetFromFlat();
        break;

      // ————— подъезд —————
      case 'stair.flat-door':
        this.game.travelTo('flat', { spawnAt: 'flat.door' });
        this.game.say('Дверь закрывается за спиной. В квартире теплее на десять градусов.');
        break;
      case 'stair.mailboxes':
        this.game.spendMinutes(1);
        this.game.say('Ящики вскрыты, кроме одного. В нём квитанция за декабрь и чей-то детский рисунок.');
        break;
      case 'stair.lift':
        this.game.say('Лифт не работает с осени. Теперь это уже не важно.');
        break;
      case 'stair.window':
        this.game.say('Окно между этажами. Через него видно, что двор пуст — и что снег лежит ровно.');
        break;
      case 'stair.neighbor':
        this.meetValera();
        break;
      case 'stair.street-door':
        this.leaveStairwell();
        break;

      // ————— двор —————
      case 'street.stair-door':
        this.enterStairwell();
        break;
      case 'street.shop-door':
        this.enterShop();
        break;
      case 'street.notice':
        this.game.spendMinutes(1);
        this.game.say(
          '«Уважаемые жильцы! В связи с аварийной ситуацией подача тепла приостановлена до особого распоряжения». Внизу — вчерашнее число.',
        );
        break;
      case 'street.bins':
        this.loot('street.bins', [['galety', 1], ['vodka', 1]], 'Баки выпотрошены. На дне — галеты и бутылка, которую пожалели.');
        break;
      case 'street.pallets':
        this.loot(
          'street.pallets',
          [['wood', 2]],
          'Штабель поддонов под снегом. Верхние доски сырые, нижние — сухие и звонкие. Ты выламываешь охапку.',
        );
        break;
      case 'street.car1':
        this.loot('street.car1', [['batteries', 2]], 'Машина чужая, дверь не заперта. На заднем сиденье — детское кресло и батарейки.');
        break;
      case 'street.car2':
        this.loot('street.car2', [['flashlight', 1], ['knife', 1]], 'В бардачке фонарик и кухонный нож. Люди возят с собой странное.');
        break;
      case 'street.playground':
        this.game.spendMinutes(1);
        this.game.say('Горка под снегом. У песочницы кто-то выкопал ямку и ушёл, не засыпав.');
        break;
      case 'street.lamp':
        this.game.say('Фонарь горит. Значит, где-то ещё есть ток. Значит, кто-то его бережёт.');
        break;
      case 'street.transformer':
        this.transformer();
        break;

      // ————— магазин —————
      case 'shop.shelf-a':
        this.loot('shop.shelf-a', [['galety', 1], ['matches', 1]], 'Полка у стены. Почти пусто, но спички есть.');
        break;
      case 'shop.shelf-b':
        this.loot('shop.shelf-b', [['tushonka', 2], ['water_bottle', 1]], 'Консервы. Кто-то снял три банки и оставил четыре. Странная щедрость.');
        break;
      case 'shop.shelf-c':
        this.loot('shop.shelf-c', [['sugar', 1], ['chay', 1]], 'Сахар и чай. Набор человека, который собирается жить дальше.');
        break;
      case 'shop.counter':
        this.loot('shop.counter', [['cigarettes', 1]], 'Касса вскрыта. В ящике — три тысячи и записка: «не бери всё». Ты берёшь всё.');
        break;
      case 'shop.fridge':
        this.game.spendMinutes(1);
        this.game.say('Холодильная витрина выключена давно. Внутри — иней и запах, который лучше не описывать.');
        break;
      case 'shop.window':
        this.game.say('Витрина выбита изнутри. Снег занёс пол до кассы.');
        break;
      case 'shop.man':
        this.meetLooter();
        break;
      case 'shop.exit':
        this.leaveShop();
        break;
      default:
        this.game.info('Здесь ничего нет.');
    }
  }

  // ————— сцены —————

  /** Печь: единственный способ вернуть дому тепло, когда отопление не работает. */
  private stove(): void {
    const g = this.game;
    const p = g.player;
    if (!p) return;
    const heat = g.heat;

    if (heat.lit) {
      g.say(`Топка гудит. Огня хватит ещё на ${hoursLabel(heat.burnHours)}.`);
    } else {
      g.say(`Печь холодная. В комнате ${formatTemperature(heat.temperature)}.`);
    }

    const hasFire = p.inventory.has('matches') || p.inventory.has('lighter');
    const fuel = p.inventory.list().filter(({ def }) => def.fuel);
    if (!fuel.length) {
      g.info('Топить нечем. Дрова надо искать на улице.');
      return;
    }
    if (!hasFire) {
      g.info('Спичек нет. Печь — просто железо.');
      return;
    }

    const options: DialogueOption[] = fuel.map(({ def, count }) => ({
      id: `fuel:${def.id}`,
      text: `Подложить: ${def.name}${count > 1 ? ` ×${count}` : ''}`,
      note: `${hoursLabel(def.fuel ?? 0)} горения`,
    }));
    options.push({ id: 'leave', text: 'Пока не надо' });

    this.dialogue(
      'Печь',
      'Дверца на скрипящих петлях. Внутри старая зола и обгоревшая газета.',
      options,
      (id) => {
        if (!id.startsWith('fuel:')) return;
        const fuelId = id.slice('fuel:'.length);
        const def = item(fuelId);
        if (!def.fuel || !g.take(fuelId, 1)) return;
        heat.addFuel(def.fuel);
        g.spendMinutes(4);
        g.say(`Огонь берётся не сразу, потом гудит. Хватит ещё на ${hoursLabel(def.fuel)}.`);
        if (heat.temperature < 0) {
          g.say('Дом прогреется не мгновенно: сначала прогревается кирпич.');
        }
        g.events.onVitals();
        g.save();
      },
    );
  }

  private windowView(): void {
    const g = this.game;
    g.spendMinutes(2);
    if (!g.getFlag('seen.window')) {
      g.setFlag('seen.window');
      g.say('Снег идёт третий час и не тает. Двор внизу стал плоским: машины, горка, баки — под одним одеялом.');
      g.say('На снегу ни одного следа. Ни одного.');
      g.say('Ты стоишь и смотришь, пока не начинают мёрзнуть пальцы на раме.');
    } else {
      g.say('Ты смотришь в окно ещё раз. Ничего не меняется, кроме света.');
    }
  }

  private exitToStreetFromFlat(): void {
    const g = this.game;
    if (!g.getFlag('warned.cold')) {
      g.setFlag('warned.cold');
      g.say('Ты берёшься за ручку и понимаешь, что за дверью будет холоднее, чем в квартире. Намного.');
    }
    g.travelTo('stairwell', { spawnAt: 'stair.flat-door' });
    if (!g.getFlag('seen.stair')) {
      g.setFlag('seen.stair');
      g.say('Подъезд гулкий и синий от света с лестницы. Где-то ниже капает вода.');
      g.say('На третьем этаже кто-то кашляет и чертыхается.');
    }
  }

  private leaveStairwell(): void {
    const g = this.game;
    const p = g.player;
    if (!p) return;
    if (p.insulation < 12 && !g.getFlag('warned.insulation')) {
      g.setFlag('warned.insulation');
      g.say('Ты чувствуешь, что одет не по погоде. На улице минус двадцать девять.');
    }
    g.travelTo('street', { spawnAt: 'street.stair-door' });
    if (!g.getFlag('seen.street')) {
      g.setFlag('seen.street');
      g.say('Дверь подъезда закрывается с грохотом, который слышно на весь двор. Тишина после него — плотная, как вата.');
      g.say('Холод забирается под куртку сразу, без предисловий.');
    }
  }

  private enterStairwell(): void {
    const g = this.game;
    if (g.getFlag('shop.done') && !g.getFlag('ending.shown')) {
      this.finale('home');
      return;
    }
    g.travelTo('stairwell', { spawnAt: 'stair.street-door' });
  }

  private enterShop(): void {
    const g = this.game;
    g.travelTo('shop', { spawnAt: 'shop.exit' });
    if (!g.getFlag('seen.shop')) {
      g.setFlag('seen.shop');
      g.say('Дверь магазина приоткрыта. Внутри темно, но не пусто.');
    }
  }

  private leaveShop(): void {
    const g = this.game;
    if (g.getFlag('shop.done')) {
      this.finale('street');
      return;
    }
    g.travelTo('street', { spawnAt: 'street.shop-door' });
  }

  private transformer(): void {
    const g = this.game;
    const p = g.player;
    if (!p) return;
    const isHandy = p.def.id === 'tolya' || p.def.id === 'dima';
    if (g.getFlag('transformer.open')) {
      g.say('Будка уже открыта. Внутри гудит, как живая.');
      return;
    }
    if (!isHandy) {
      g.say('Замок на будке свежий. Ты дёргаешь — он держит.');
      return;
    }
    g.spendMinutes(5);
    g.setFlag('transformer.open');
    g.say('Замок поддаётся. Внутри тепло, гудит трансформатор, и на стене висит чей-то ватник.');
    g.give('vodka', 1);
    g.give('batteries', 2);
  }

  // ————— люди —————

  private meetValera(): void {
    const g = this.game;
    const p = g.player;
    if (!p) return;

    if (g.getFlag('valera.resolved')) {
      g.say('Валера стоит у стены и смотрит в сторону. Разговор уже был.');
      return;
    }

    g.speech('Валера', 'Стой. Стой, я тебя знаю. Ты с девятого, да? Слышь, у тебя пожрать есть?');
    g.say('Он держит монтировку не как оружие, а как вещь, которую некуда положить. Пока.');

    const options: DialogueOption[] = [
      {
        id: 'ask',
        text: 'Спросить, что случилось на самом деле',
        note: 'может, он знает больше',
      },
      {
        id: 'share',
        text: 'Отдать ему еду',
        note: p.inventory.count('tushonka') + p.inventory.count('bread') > 0 ? 'у тебя есть чем поделиться' : 'нечего отдавать',
        disabled: p.inventory.count('tushonka') + p.inventory.count('bread') === 0,
      },
      {
        id: 'lie',
        text: 'Сказать, что у тебя самого ничего нет',
        note: 'сухо и без вранья в голосе',
      },
      {
        id: 'threat',
        text: 'Показать, что у тебя есть чем ответить',
        note: p.def.id === 'tolya' ? 'монтировка против монтировки — не аргумент' : 'зависит от того, как ты стоишь',
      },
    ];
    if (p.def.id === 'valya') {
      options.push({ id: 'teach', text: 'Сказать ему то, что говорила пятому «Б»', note: 'работает чаще, чем кажется' });
    }

    this.dialogue('Валера', 'Ну? Я не грабитель. Я просто спросил.', options, (id) => {
      switch (id) {
        case 'ask':
          g.say('«Ночью свет вырубило. Потом вода. Потом связь. Утром я вышел — а во дворе никого. Совсем никого, понимаешь? В девять утра в субботу. Ни одного человека».');
          g.setFlag('valera.talked');
          g.say('Он говорит ещё минуту и замолкает. Ты понимаешь, что он не столько рассказывает, сколько проверяет, слышишь ли ты то же самое.');
          g.setFlag('valera.resolved');
          g.setFlag('valera.friendly');
          break;
        case 'share': {
          const what = p.inventory.count('tushonka') > 0 ? 'tushonka' : 'bread';
          g.take(what, 1);
          g.say(`Ты отдаёшь ${item(what).name.toLowerCase()}. Он берёт обеими руками, как берут чужое.`);
          g.speech('Валера', 'Спасибо. Я запомню. Правда запомню.');
          g.setFlag('valera.resolved');
          g.setFlag('valera.friendly');
          g.setFlag('gave-food');
          break;
        }
        case 'lie':
          g.speech('Валера', 'Ну и ладно. Ну и иди.');
          g.say('Он отступает к стене и больше не смотрит на тебя.');
          g.setFlag('valera.resolved');
          break;
        case 'threat':
          if (p.stats.might >= 5 || p.inventory.bestWeapon()?.combat) {
            g.say('Ты не говоришь ничего. Ты просто перестаёшь быть удобным.');
            g.speech('Валера', 'Ладно. Ладно-ладно. Иди.');
            g.setFlag('valera.resolved');
            g.setFlag('valera.scared');
          } else {
            g.say('Ты стараешься стоять так, чтобы он поверил. Он не поверил.');
            g.setFlag('valera.resolved');
            g.setFlag('valera.scared');
            this.startCombat(VALERA, 'valera');
          }
          break;
        case 'teach':
          g.say('Ты говоришь ему то, что говорила в школе: спокойно, по одному предложению, глядя в глаза.');
          g.speech('Валера', 'Да понял я, понял. Прости. Я просто… я не знаю, что делать.');
          g.setFlag('valera.resolved');
          g.setFlag('valera.friendly');
          break;
      }
      g.events.onVitals();
    });
  }

  private meetLooter(): void {
    const g = this.game;
    const p = g.player;
    if (!p) return;

    if (g.getFlag('looter.resolved')) {
      g.say('Человек у полки больше не шевелится.');
      return;
    }

    g.speech('Незнакомец', 'Я слышал, как ты вошёл. У тебя рюкзак. У меня — ничего.');
    g.say('Он сидит на корточках у полки и складывает консервы в чужую сумку. Руки у него дрожат — но не от холода.');

    const options: DialogueOption[] = [
      { id: 'talk', text: 'Спросить, откуда он', note: 'он не выглядит как грабитель' },
      { id: 'split', text: 'Предложить поделить', note: 'половина лучше, чем драка' },
      { id: 'take', text: 'Сказать, что это теперь твоё', note: 'и не отступать' },
      { id: 'leave', text: 'Уйти и оставить его', note: 'не твоя война' },
    ];
    if (p.def.id === 'irina') {
      options.unshift({ id: 'heal', text: 'Осмотреть его руку', note: 'врач видит то, что другие не видят' });
    }

    this.dialogue('Незнакомец', 'Я не хочу драться. Но и уйти не могу.', options, (id) => {
      switch (id) {
        case 'heal':
          g.say('У него рассечена рука — старая рана, уже загноилась. Ты перевязываешь её тем, что есть.');
          g.give('pills', 1);
          g.speech('Незнакомец', 'Ты… ты врач? Слушай. На втором этаже, в квартире над магазином, жила женщина с собакой. Я стучал — никто.');
          g.say('Он уходит, оставив половину консервов. Половину — впервые за три дня.');
          g.setFlag('looter.resolved');
          g.setFlag('looter.friendly');
          break;
        case 'talk':
          g.speech('Незнакомец', 'Дальше по улице — общага. Там ещё кто-то есть. Я не пошёл. У них был пёс.');
          g.say('Он говорит тихо и не поднимает глаз. Ты понимаешь, что он не опасен — он просто голоден и очень боится.');
          g.setFlag('looter.resolved');
          g.setFlag('looter.talked');
          break;
        case 'split':
          g.give('tushonka', 1);
          g.say('Ты делишь то, что нашёл. Он забирает свою половину и уходит, не оборачиваясь.');
          g.setFlag('looter.resolved');
          g.setFlag('looter.friendly');
          break;
        case 'take':
          g.say('Ты делаешь шаг вперёд и не отводишь взгляда. Он поднимается.');
          this.startCombat(LOOTER, 'looter');
          return;
        case 'leave':
          g.say('Ты уходишь, оставляя его с консервами. Он не говорит спасибо — он не верит.');
          g.setFlag('looter.resolved');
          g.setFlag('looter.left');
          break;
      }
      g.setFlag('shop.done');
      g.events.onVitals();
    });
  }

  // ————— бой —————

  private startCombat(enemy: EnemyDef, key: string): void {
    const g = this.game;
    g.setPhaseExternal('combat');
    const combat = new Combat(g, enemy, (outcome) => {
      this.combatView.hide();
      g.setPhaseExternal('playing');
      if (outcome === 'win') {
        g.say(`${enemy.name} оседает на пол и больше не встаёт.`);
        g.setFlag(`${key}.defeated`);
        g.setFlag('killed');
        g.setFlag('shop.done');
        g.setFlag(`${key}.resolved`);
      } else if (outcome === 'lose') {
        g.die('Ты не удержался на ногах. Дальше — темнота и очень тихо.');
      } else {
        g.say('Ты уходишь. За спиной никто не бежит.');
        g.setFlag(`${key}.resolved`);
      }
      g.events.onVitals();
    });
    this.combatView.show(combat);
  }

  // ————— финал —————

  private finale(where: 'home' | 'street'): void {
    const g = this.game;
    if (g.getFlag('ending.shown')) return;
    g.setFlag('ending.shown');

    const flags = g.flags;
    let text: string;
    if (flags['killed']) {
      text =
        'Ты возвращаешься домой и долго не можешь снять куртку. В кармане — чужие консервы. В голове — чужая рука, которая тянулась к ним. Ты выжил. Это пока всё, что можно сказать.';
    } else if (flags['gave-food'] || flags['looter.friendly']) {
      text =
        'Ты возвращаешься домой. Свет в квартире не появился, отопление не включили, но в подъезде теперь есть человек, который знает твоё имя. В этом городе это уже ресурс.';
    } else if (flags['looter.left']) {
      text =
        'Ты уходишь и не оборачиваешься. За спиной остаётся человек с консервами и без надежды. Ты говоришь себе, что это не твоя война. Пока получается.';
    } else {
      text =
        'Ты возвращаешься домой с полным рюкзаком и пустым чувством. День первый закончился. Завтра будет второй, и он будет холоднее.';
    }

    if (where === 'street') {
      g.say('Ты закрываешь дверь магазина и идёшь обратно через двор. Снег всё идёт.');
    }
    clearSave();
    this.ui.showFinale('конец первого дня', text, () => window.location.reload());
    g.setPhaseExternal('ending');
  }

  // ————— утилиты —————

  private loot(spotId: string, items: Array<[string, number]>, text: string): void {
    const g = this.game;
    const key = `loot:${spotId}`;
    if (g.getFlag(key)) {
      g.info('Здесь уже пусто.');
      return;
    }
    g.setFlag(key);
    g.spendMinutes(3);
    g.say(text);
    for (const [id, n] of items) g.give(id, n);
  }

  private dialogue(
    who: string,
    text: string,
    options: DialogueOption[],
    onChoose: (id: string) => void,
  ): void {
    const g = this.game;
    g.setPhaseExternal('dialogue');
    this.ui.showDialogue({ who, text, options }, (id) => {
      g.setPhaseExternal('playing');
      onChoose(id);
    });
  }
}

/** Часы и минуты без дробей: «2 ч 40 мин». */
function hoursLabel(hours: number): string {
  if (hours <= 0) return 'несколько минут';
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (whole === 0) return `${minutes} мин`;
  if (minutes === 0) return `${whole} ч`;
  return `${whole} ч ${minutes} мин`;
}
