// Ничего не сохраняется и не отправляется: всё живёт только в открытой вкладке.
import * as L from './logic.js';
import { localReply, ventReply, crisis, SERIOUS } from './support.js';
import { FACTS, ENGLISH, KINDS, pickKind, draw, makeMath } from './breaks.js';
const $ = id => document.getElementById(id);
const settings = { ...L.DEFAULTS, days: [...L.DEFAULTS.days] }, seen = { fact: [], english: [] }, replies = [], talk = [];
let draft, water = 0, lastKind = '', toastTimer;

function toast(t) { $('toast').textContent = t; $('toast').classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('on'), 3500); }
function button(parent, text, label, pressed, fn) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = text;
  if (label) b.setAttribute('aria-label', label);
  b.setAttribute('aria-pressed', pressed); b.onclick = fn; parent.append(b); return b;
}
function group(id, items, isOn, toggle) {
  const box = $(id); box.replaceChildren();
  items.forEach(([v, text, label]) => button(box, text, label, isOn(v), () => {
    toggle(v); [...box.children].forEach((b, i) => b.setAttribute('aria-pressed', isOn(items[i][0])));
    $('save').disabled = !(draft.mood && draft.fatigue);
  }));
}
const today = () => L.todayKey();

function newDay() {
  draft = { mood: 0, fatigue: 0, tags: [], note: '' };
  $('note').value = ''; $('save').disabled = true; $('form').hidden = false; $('done').hidden = true; $('helpDay').hidden = true;
  $('title').textContent = 'Как прошёл день?';
  $('date').textContent = L.parseKey(today()).toLocaleDateString('ru', { weekday: 'long', day: 'numeric', month: 'long' });
  group('moods', [1, 2, 3, 4, 5].map(n => [n, ...L.MOODS[n]]), v => draft.mood === v, v => { draft.mood = v; });
  group('fatigue', [1, 2, 3, 4, 5].map(n => [n, String(n), `Усталость ${n} из 5`]), v => draft.fatigue === v, v => { draft.fatigue = v; });
  group('tags', L.TAGS.map(([v, icon, name]) => [v, `${icon} ${name}`]), v => draft.tags.includes(v),
    v => { draft.tags = draft.tags.includes(v) ? draft.tags.filter(x => x !== v) : [...draft.tags, v]; });
}
function answer() {
  const danger = crisis(draft.note);
  const text = danger ? SERIOUS : localReply(draft, today(), replies.slice(-9));
  if (!danger) replies.push(text);
  $('doneMood').textContent = danger ? '' : L.MOODS[draft.mood][0]; $('reply').textContent = text;
  $('form').hidden = true; $('done').hidden = false; $('more1').hidden = danger; $('helpDay').hidden = !danger;
  $('title').textContent = danger ? 'Ты не одна' : 'Слова для тебя';
}
$('form').onsubmit = ev => {
  ev.preventDefault(); if (!draft.mood || !draft.fatigue) return;
  draft.note = $('note').value.trim(); $('note').blur(); answer(); scrollTo(0, 0);
};
$('more1').onclick = answer;
$('again').onclick = newDay;

function renderWater() { $('waterN').textContent = water ? `Стаканов: ${water}` : 'Стакан воды'; $('waterMinus').disabled = !water; }
$('waterPlus').onclick = () => { water++; renderWater(); };
$('waterMinus').onclick = () => { water--; renderWater(); };

function renderVent() {
  $('vtext').placeholder = talk.length ? 'Можно продолжить' : 'Что на душе?';
  $('chat').replaceChildren(...talk.map(m => { const p = document.createElement('p'); p.className = m.role; p.textContent = m.content; return p; }));
  $('helpVent').hidden = !(talk.some(m => m.role === 'user' && crisis(m.content)) || crisis($('vtext').value));
}
$('vtext').oninput = () => { if (crisis($('vtext').value)) $('helpVent').hidden = false; };
$('vform').onsubmit = ev => {
  ev.preventDefault(); const text = $('vtext').value.trim(); if (!text) return;
  const recent = talk.filter(m => m.role === 'assistant').slice(-10).map(m => m.content);
  talk.push({ role: 'user', content: text }, { role: 'assistant', content: ventReply(text, recent) });
  $('vtext').value = ''; renderVent(); $('chat').lastElementChild.scrollIntoView({ block: 'nearest' });
};
$('vend').onclick = () => { talk.length = 0; $('vtext').value = ''; renderVent(); scrollTo(0, 0); };

let timer, kind, task;
const TABS = { ...KINDS, air: 'Дыхание' };
function nextCard(k = kind) {
  kind = k; $('cardBack').textContent = ''; $('air').hidden = k !== 'air'; $('card').hidden = k === 'air'; $('more').hidden = k === 'air';
  $('mform').hidden = k !== 'math'; $('show').hidden = k !== 'english';
  [...$('kinds').children].forEach(b => b.setAttribute('aria-pressed', b.dataset.k === k));
  if (k === 'math') { task = makeMath(task?.[0]); $('cardText').textContent = task[0]; $('manswer').value = ''; }
  else if (k !== 'air') {
    const list = k === 'fact' ? FACTS : ENGLISH; let i; [i, seen[k]] = draw(seen[k], list.length);
    $('cardText').textContent = k === 'fact' ? list[i] : list[i][0]; task = list[i];
  }
}
for (const k in TABS) button($('kinds'), TABS[k], '', false, () => nextCard(k)).dataset.k = k;
$('more').onclick = () => nextCard();
$('show').onclick = () => { $('cardBack').textContent = task[1]; $('show').hidden = true; };
$('mform').onsubmit = ev => {
  ev.preventDefault(); const v = $('manswer').value.trim(); if (!v) return;
  $('cardBack').textContent = Number(v.replace(',', '.')) === task[1] ? 'Верно!' : `Почти. Ответ: ${task[1]}`;
};
$('breathe').onclick = () => {
  const start = Date.now(), end = start + 120000;
  lastKind = pickKind(lastKind); nextCard(lastKind); $('breath').showModal();
  const tick = () => {
    const left = Math.ceil((end - Date.now()) / 1000);
    if (left <= 0) { clearInterval(timer); $('left').textContent = 'Перерыв окончен. Можно возвращаться.'; $('phase').textContent = ''; return; }
    const inhale = (Date.now() - start) % 10000 < 4000, text = inhale ? 'Вдох' : 'Выдох';
    if ($('phase').textContent !== text) $('phase').textContent = text;
    $('circle').className = 'circle ' + (inhale ? 'in' : 'out');
    $('left').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  };
  clearInterval(timer); tick(); timer = setInterval(tick, 200);
};
$('stop').onclick = () => $('breath').close();
$('breath').onclose = () => clearInterval(timer);

for (const [n, t] of [[1, 'каждый час'], [2, 'каждые 2 часа'], [3, 'каждые 3 часа'], [4, 'каждые 4 часа']]) $('s-restEvery').add(new Option(t, n));
for (const f of ['evening', 'rest']) $('s-' + f).checked = settings[f];
for (const f of ['eveningTime', 'from', 'to', 'restEvery']) $('s-' + f).value = settings[f];
[[1, 'пн', 'понедельник'], [2, 'вт', 'вторник'], [3, 'ср', 'среда'], [4, 'чт', 'четверг'], [5, 'пт', 'пятница'], [6, 'сб', 'суббота'], [0, 'вс', 'воскресенье']].forEach(([d, t, label]) => {
  const b = button($('s-days'), t, label, settings.days.includes(d), () => {
    settings.days = settings.days.includes(d) ? settings.days.filter(x => x !== d) : [...settings.days, d].sort();
    b.setAttribute('aria-pressed', settings.days.includes(d));
  });
});
$('sform').onsubmit = ev => {
  ev.preventDefault();
  for (const f of ['evening', 'rest']) settings[f] = $('s-' + f).checked;
  for (const f of ['eveningTime', 'from', 'to']) settings[f] = $('s-' + f).value;
  settings.restEvery = Number($('s-restEvery').value);
  if (settings.from >= settings.to) return toast('Конец рабочего дня должен быть позже начала');
  const ics = L.makeIcs(settings); if (!ics) return toast('Выбери хотя бы одно напоминание и один день');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'tihiy-vecher.ics';
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  toast('Файл готов. Открой его и подтверди добавление');
};

function show(v) {
  for (const x of ['today', 'vent', 'set']) $('v-' + x).hidden = x !== v;
  document.querySelectorAll('nav button').forEach(b => b.dataset.v === v ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  scrollTo(0, 0);
}
document.querySelectorAll('nav button').forEach(b => { b.onclick = () => show(b.dataset.v); });
newDay(); renderWater(); renderVent(); show('today');
