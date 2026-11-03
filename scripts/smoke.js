(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = window.__game.game;
  const ui = window.__game.ui;
  const sc = window.__game.scenario;
  const transcript = [];
  const spot = (id) => g.level.spots.find((s) => s.id === id);
  const click = (sel, idx = 0) => {
    const nodes = document.querySelectorAll(sel);
    if (!nodes[idx]) {
      transcript.push('НЕТ ЭЛЕМЕНТА: ' + sel + '[' + idx + ']');
      return false;
    }
    nodes[idx].click();
    return true;
  };
  const step = async (name, fn) => {
    try {
      fn();
      await wait(220);
      transcript.push(name + ' → ' + g.phase + ' | ' + g.level.id + ' | лог ' + g.log.entries.length);
    } catch (e) {
      transcript.push(name + ' ОШИБКА: ' + e.message);
    }
  };

  click('.title-screen__go');
  await wait(500);
  click('.card', 4);
  await wait(900);
  transcript.push('старт: ' + g.phase + ' / ' + (g.player && g.player.def.id));

  await step('квартира.окно', () => sc.handle(spot('flat.window')));
  await step('квартира.шкаф', () => sc.handle(spot('flat.hall-wardrobe')));
  await step('квартира.холодильник', () => sc.handle(spot('flat.fridge')));
  await step('квартира.дверь', () => sc.handle(spot('flat.door')));

  await step('подъезд.сосед', () => sc.handle(spot('stair.neighbor')));
  click('.choice', 1);
  await wait(300);
  transcript.push('после диалога: ' + g.phase + ' | флаги ' + JSON.stringify(Object.keys(g.flags)));

  await step('подъезд.улица', () => sc.handle(spot('stair.street-door')));
  await step('двор.объявление', () => sc.handle(spot('street.notice')));
  await step('двор.магазин', () => sc.handle(spot('street.shop-door')));

  await step('магазин.полка', () => sc.handle(spot('shop.shelf-b')));
  await step('магазин.человек', () => sc.handle(spot('shop.man')));
  click('.choice', 2);
  await wait(400);
  transcript.push('после диалога: ' + g.phase);

  for (let i = 0; i < 12; i++) {
    const btns = Array.from(document.querySelectorAll('.combat .act'));
    if (!btns.length) {
      transcript.push('бой закончился на шаге ' + i + ' | ' + g.phase);
      break;
    }
    const strike = btns.find((b) => b.textContent.startsWith('Ударить') && !b.disabled);
    const next = strike || btns.find((b) => !b.disabled);
    if (!next) {
      transcript.push('нет доступных действий на шаге ' + i);
      break;
    }
    next.click();
    await wait(260);
  }

  transcript.push('после боя: ' + g.phase + ' | hp ' + Math.round(g.player.vitals.state.health));
  await wait(300);
  await step('магазин.выход', () => sc.handle(spot('shop.exit')));
  transcript.push('финал: ' + g.phase + ' | финальный экран ' + document.querySelectorAll('.finale').length);

  return transcript.join('\n');
})()
