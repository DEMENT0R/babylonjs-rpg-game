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

  const startBtn = Array.from(document.querySelectorAll('.title-screen__go')).find((b) =>
    b.textContent.includes('начать'),
  );
  transcript.push(
    'титул: ' +
      (document.querySelector('.title-screen__version')?.textContent ?? '—') +
      ' · ' +
      (document.querySelector('.changelog-link')?.textContent ?? '—'),
  );
  if (startBtn) startBtn.click();
  await wait(500);
  click('.card', 3);
  await wait(900);
  transcript.push('старт: ' + g.phase + ' / ' + (g.player && g.player.def.id));

  // ————— день первый —————
  await step('квартира.окно', () => sc.handle(spot('flat.window')));
  await step('квартира.шкаф', () => sc.handle(spot('flat.wardrobe')));
  await step('квартира.стол', () => sc.handle(spot('flat.table')));
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

  // ————— домой —————
  g.travelTo('stairwell', { spawnAt: 'stair.street-door' });
  g.travelTo('flat', { spawnAt: 'flat.wardrobe' });
  await step('квартира.шкаф на дрова', () => sc.handle(spot('flat.wardrobe')));
  click('.choice', 0);
  await wait(300);

  g.travelTo('flat', { spawnAt: 'flat.stove' });
  await step('квартира.печь', () => sc.handle(spot('flat.stove')));
  click('.choice', 0);
  await wait(300);
  transcript.push('печь: ' + (g.heat.lit ? 'горит, ' + g.heat.burnHours.toFixed(1) + ' ч' : 'холодная'));

  g.travelTo('flat', { spawnAt: 'flat.bed' });
  await step('кровать.вечер', () => sc.handle(spot('flat.bed')));
  click('.choice', 0); // дождаться темноты — сразу откроется «Первая ночь»
  await wait(400);
  transcript.push('вечер: ' + g.clock.label + ' | в комнате ' + g.heat.temperature.toFixed(1));
  click('.choice', 0); // лечь спать
  await wait(1500);
  transcript.push(
    'утро: день ' + g.clock.day + ' | ' + g.clock.label + ' | ' + g.phase + ' | в комнате ' +
      g.heat.temperature.toFixed(1) + ' | тепло ' + Math.round(g.player.vitals.state.warmth),
  );

  // ————— день второй —————
  await step('квартира.печь день 2', () => sc.handle(spot('flat.stove')));
  if (document.querySelectorAll('.choice').length) click('.choice', 0);
  await wait(300);
  await step('квартира.печь день 2 ещё', () => sc.handle(spot('flat.stove')));
  if (document.querySelectorAll('.choice').length) click('.choice', 0);
  await wait(300);
  transcript.push('печь день 2: ' + (g.heat.lit ? 'горит, ' + g.heat.burnHours.toFixed(1) + ' ч' : 'холодная'));

  await step('кровать.день 2', () => sc.handle(spot('flat.bed')));
  click('.choice', 0); // дождаться вечера — откроется «Вторая ночь»
  await wait(500);
  transcript.push('вечер 2: ' + g.clock.label + ' | в комнате ' + g.heat.temperature.toFixed(1));
  click('.choice', 0); // лечь спать
  await wait(1500);

  transcript.push(
    'финал: ' + g.phase + ' | экран ' + document.querySelectorAll('.finale').length + ' | заголовок «' +
      (document.querySelector('.finale__title')?.textContent ?? '—') + '»',
  );
  transcript.push('сохранение после финала: ' + (localStorage.getItem('panel.zone.save.v1') ? 'есть' : 'стёрто'));

  return transcript.join('\n');
})()
