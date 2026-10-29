// Лёгкая анимация появления блоков и отправка заявки. Без внешних библиотек.
(function () {
  // Плавное появление блоков при прокрутке
  var items = document.querySelectorAll('.reveal');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // Форма записи: отправляет заявку в /api/lead (см. functions/api/lead.js), оттуда она уходит в Telegram
  var form = document.getElementById('lead-form');
  if (!form) return;
  var status = form.querySelector('.form-status');
  var button = form.querySelector('button[type="submit"]');

  function say(text, kind) {
    status.textContent = text;
    status.className = 'form-status ' + (kind || '');
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = form.elements;
    if (!f.name.value.trim() || !f.contact.value.trim()) { say('Укажите имя и способ связи.', 'err'); return; }
    if (!f.consent.checked) { say('Нужно согласие на обработку персональных данных.', 'err'); return; }
    button.disabled = true;
    say('Отправляю…');
    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: f.name.value.trim(),
        contact: f.contact.value.trim(),
        message: f.message.value.trim(),
        website: f.website.value,
        consent: true
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('bad status');
      form.reset();
      say('Спасибо! Заявка отправлена, скоро свяжусь с вами.', 'ok');
    }).catch(function () {
      say('Не получилось отправить заявку. Напишите или позвоните мне напрямую — контакты внизу страницы.', 'err');
    }).then(function () { button.disabled = false; });
  });
})();
