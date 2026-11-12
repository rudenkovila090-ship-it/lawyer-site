// Приём заявки с сайта: присваивает ей номер и отправляет уведомление в Telegram.
// Работает на Cloudflare Pages Functions. Секреты задаются в настройках проекта
// (Settings → Variables and Secrets): TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID.
// Не вписывать токен в код и не коммитить его в репозиторий.

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const clean = (value, max) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);

// Номер заявки: дата (ГГММДД) и четыре случайные цифры, например 261029-4827
function ticketNumber() {
  const d = new Date();
  const yymmdd = String(d.getUTCFullYear()).slice(2) + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0');
  const rnd = String(crypto.getRandomValues(new Uint16Array(1))[0] % 10000).padStart(4, '0');
  return `${yymmdd}-${rnd}`;
}

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400);
  }

  if (data.website) return json({ ok: true, number: ticketNumber() }); // скрытое поле-ловушка для ботов

  const fio = clean(data.fio, 150);
  const phone = clean(data.phone, 40);
  const email = clean(data.email, 150);
  const message = clean(data.message, 2000);
  const tgRaw = clean(data.telegram, 100).replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '');
  const digits = phone.replace(/\D/g, '');

  const invalid =
    fio.length < 2 ||
    digits.length < 10 || digits.length > 15 ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    (tgRaw && !/^[A-Za-z0-9_]{3,32}$/.test(tgRaw)) ||
    message.length < 3 ||
    data.policy !== true ||
    data.consent !== true;
  if (invalid) return json({ ok: false, error: 'invalid' }, 400);

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return json({ ok: false, error: 'not_configured' }, 503);

  const number = ticketNumber();
  const text = [
    `Новая заявка № ${number}`,
    `ФИО: ${fio}`,
    `Телефон: ${phone}`,
    `Email: ${email || 'не указан'}`,
    `Telegram: ${tgRaw ? '@' + tgRaw : 'не указан'}`,
    `Вопрос: ${message}`,
    `Ознакомление с политикой: да`,
    `Согласие на обработку персональных данных: да`,
    `Рекламно-информационные материалы: ${data.marketing === true ? 'согласие получено' : 'согласия нет'}`
  ].join('\n');

  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text })
  });
  return res.ok ? json({ ok: true, number }) : json({ ok: false, error: 'telegram' }, 502);
}
