// Приём заявки с сайта и отправка уведомления в Telegram.
// Работает на Cloudflare Pages Functions. Секреты задаются в настройках проекта
// (Settings → Variables and Secrets): TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID.
// Не вписывать токен в код и не коммитить его в репозиторий.

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const clean = (value, max) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400);
  }

  if (data.website) return json({ ok: true }); // скрытое поле-ловушка для ботов

  const name = clean(data.name, 100);
  const contact = clean(data.contact, 100);
  const message = clean(data.message, 1500);
  if (!name || !contact || data.consent !== true) return json({ ok: false, error: 'invalid' }, 400);

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return json({ ok: false, error: 'not_configured' }, 503);

  const text = ['Новая заявка с сайта', `Имя: ${name}`, `Связь: ${contact}`, message ? `Ситуация: ${message}` : 'Ситуация: не указана'].join('\n');

  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text })
  });
  return res.ok ? json({ ok: true }) : json({ ok: false, error: 'telegram' }, 502);
}
