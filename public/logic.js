// Вся логика без интерфейса: проверяется командой npm test.
export const MOODS = [null, ['😫', 'Очень тяжело'], ['😕', 'Тяжело'], ['😐', 'Обычно'], ['🙂', 'Хорошо'], ['😊', 'Отлично']];
export const TAGS = [
  ['hard', '🌧️', 'сложный день'], ['client', '😤', 'сложный клиент'], ['plan', '📈', 'давят с планом'], ['nobreak', '🏃', 'не было перерыва'],
  ['conflict', '👔', 'конфликт с руководством'], ['sale', '🎉', 'удачная продажа'],
  ['colleague', '🙏', 'коллега поблагодарил'], ['calm', '☕', 'спокойный день'],
];
export const DEFAULTS = {
  evening: true, eveningTime: '18:30', rest: true, restEvery: 1,
  from: '09:00', to: '18:00', days: [1, 2, 3, 4, 5],
};
const pad = n => String(n).padStart(2, '0');
export const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
// До 4 утра отметка ещё относится к прошедшему дню.
export function todayKey(now = new Date()) { const d = new Date(now); d.setHours(d.getHours() - 4); return key(d); }
export function isMonthEnd(k) {
  const d = parseKey(k), last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return last - d.getDate() < 7;
}

const mins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export function slots(from, to, hours) {
  const out = [];
  for (let t = mins(from) + hours * 60; t < mins(to); t += hours * 60) out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  return out;
}

// Файл календаря: обычные повторяющиеся события с сигналом, время местное.
export function makeIcs(s, now = new Date()) {
  const codes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  if (!s.days.length) return null;
  const first = new Date(now); first.setHours(12);
  while (!s.days.includes(first.getDay())) first.setDate(first.getDate() + 1);
  const date = key(first).replaceAll('-', '');
  const stamp = now.toISOString().replace(/[-:]|\.\d+/g, '');
  const list = [];
  if (s.rest) slots(s.from, s.to, s.restEvery).forEach(t => list.push(['rest', t, '💧 Выпей воды и сделай перерыв']));
  if (s.evening) list.push(['evening', s.eveningTime, '🌙 Как прошёл день?']);
  if (!list.length) return null;
  const events = list.flatMap(([id, t, title]) => ['BEGIN:VEVENT', `UID:${id}-${t.replace(':', '')}@tihiy-vecher`, `DTSTAMP:${stamp}`,
    `DTSTART:${date}T${t.replace(':', '')}00`, 'DURATION:PT5M', `RRULE:FREQ=WEEKLY;BYDAY=${s.days.map(d => codes[d]).join(',')}`,
    `SUMMARY:${title}`, 'CLASS:PRIVATE', 'TRANSP:TRANSPARENT', 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`,
    'TRIGGER:PT0S', 'END:VALARM', 'END:VEVENT']);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tihiy vecher//RU', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR', ''].join('\r\n');
}

