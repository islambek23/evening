import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../public/logic.js';
import { localReply, ventReply, crisis, SERIOUS, BY_MOOD } from '../public/support.js';
import * as B from '../public/breaks.js';
const e = (mood, fatigue = 3, tags = []) => ({ mood, fatigue, tags, note: '' });
test('после полуночи — ещё вчера', () => {
  assert.equal(L.todayKey(new Date(2026, 2, 1, 1)), '2026-02-28');
  assert.equal(L.todayKey(new Date(2026, 2, 1, 4)), '2026-03-01');
});
test('конец месяца — последние 7 дней', () => {
  assert.equal(L.isMonthEnd('2026-11-23'), false);
  assert.equal(L.isMonthEnd('2026-11-24'), true);
  assert.equal(L.isMonthEnd('2028-02-23'), true);
});
test('по 10 разных ответов на настроение, без повторов подряд', () => {
  for (const m of [1, 2, 3, 4, 5]) {
    assert.equal(new Set(BY_MOOD[m]).size, 10);
    const recent = [];
    for (let i = 0; i < 10; i++) recent.push(localReply(e(m, 2), '2026-11-10', recent));
    assert.equal(new Set(recent).size, 10);
  }
  for (const m of [1, 2]) for (const t of BY_MOOD[m]) assert.match(t, /лучшая/i);
});
test('трудный день поддерживается при любом настроении', () => {
  for (const m of [1, 2, 3, 4, 5]) for (const tag of ['hard', 'conflict']) assert.match(localReply(e(m, 3, [tag]), '2026-11-10'), /лучшая/);
  assert.match(localReply(e(4, 2, ['colleague']), '2026-11-10'), /Коллега/);
  assert.match(localReply(e(3), '2026-11-30'), /много работала/);
});
test('«Выговориться» отвечает по теме', () => {
  const v = t => ventReply(t, [], () => 0);
  assert.match(v('Начальник отчитал меня при всех'), /от кого зависит работа/);
  assert.match(v('Клиенты хамят'), /вежливой/);
  assert.match(v('Не выполнила план'), /цифрами/);
  assert.match(v('Я во всём виновата'), /строга к себе/);
  assert.match(v('Мне тревожно'), /тревожно/);
  assert.match(v('Меня всё бесит'), /Злиться можно/);
  assert.match(v('Я так устала'), /на пределе/);
  assert.match(v('Ура, я рада'), /поделилась/);
  assert.doesNotMatch(v('Я совсем не рада'), /поделилась/);
  assert.match(v('Купила планшет'), /Спасибо, что написала/);
  assert.equal(v('Начальник довёл, не хочу жить'), SERIOUS);
  assert.notEqual(ventReply('устала', [v('устала')], () => 0), v('устала'));
});
test('опасные слова', () => {
  for (const t of ['Я не хочу жить', 'хочу умереть', 'муж меня бьёт', 'думаю о самоубийстве', 'хочу убить себя']) assert.ok(crisis(t), t);
  for (const t of ['клиент бьёт рекорды', 'устала до смерти', 'очень тяжёлый день']) assert.ok(!crisis(t), t);
});
test('карточки не повторяются до конца колоды', () => {
  let seen = [], last; const got = [];
  for (let i = 0; i < 60; i++) { const [x, s] = B.draw(seen, 30); assert.notEqual(x, last); last = x; seen = s; got.push(x); }
  assert.equal(new Set(got.slice(0, 30)).size, 30);
  for (let i = 0; i < 200; i++) { assert.notEqual(B.pickKind('fact'), 'fact'); const [q, v] = B.makeMath(); assert.ok(Number.isInteger(v), q); }
});
test('календарь напоминаний', () => {
  assert.deepEqual(L.slots('09:00', '18:00', 2), ['11:00', '13:00', '15:00', '17:00']);
  const ics = L.makeIcs(L.DEFAULTS, new Date(2026, 10, 21, 10));
  assert.match(ics, /DTSTART:20261123T183000/);
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 9);
  assert.equal(L.makeIcs({ ...L.DEFAULTS, days: [] }), null);
});
