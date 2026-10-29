// Мягкая анимация появления блоков и отправка заявки. Без внешних библиотек.
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

  // Ссылки на документы в подвале раскрывают нужный блок
  document.querySelectorAll('a[href="#policy"], a[href="#consent"]').forEach(function (a) {
    a.addEventListener('click', function () {
      var d = document.getElementById(a.getAttribute('href').slice(1));
      if (d) { d.open = true; }
    });
  });

  // Форма заявки: отправка в /api/lead (см. functions/api/lead.js), оттуда уведомление уходит в Telegram
  var form = document.getElementById('lead-form');
  if (!form) return;
  var status = form.querySelector('.form-status');
  var button = form.querySelector('button[type="submit"]');
  var f = form.elements;

  function say(text) { status.textContent = text || ''; }
  function mark(el, bad) { if (bad) { el.setAttribute('aria-invalid', 'true'); } else { el.removeAttribute('aria-invalid'); } }

  function check() {
    var digits = f.phone.value.replace(/\D/g, '');
    var problems = [];
    var badFio = f.fio.value.trim().length < 2;
    var badPhone = digits.length < 10 || digits.length > 15;
    var badEmail = f.email.value.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim());
    var badTg = f.telegram.value.trim() !== '' && !/^(https?:\/\/t\.me\/)?@?[A-Za-z0-9_]{3,32}$/.test(f.telegram.value.trim());
    var badMsg = f.message.value.trim().length < 3;
    mark(f.fio, badFio); mark(f.phone, badPhone); mark(f.email, badEmail); mark(f.telegram, badTg); mark(f.message, badMsg);
    if (badFio) problems.push('укажите ФИО');
    if (badPhone) problems.push('проверьте номер телефона');
    if (badEmail) problems.push('проверьте электронную почту');
    if (badTg) problems.push('никнейм в Telegram указан неверно');
    if (badMsg) problems.push('опишите, по какому вопросу обращаетесь');
    return problems;
  }

  function showSuccess(number) {
    var box = form.querySelector('.success');
    box.querySelector('.ticket').textContent = number ? '№ ' + number : '';
    box.querySelector('.ticket-wrap').hidden = !number;
    form.classList.add('done');
    box.setAttribute('tabindex', '-1');
    box.focus();
    var copy = box.querySelector('.copy');
    if (copy && number) {
      copy.onclick = function () {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(number).then(function () { copy.textContent = 'Скопировано'; }, function () {});
        }
      };
    }
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var problems = check();
    if (problems.length) { say('Пожалуйста, ' + problems.join('; ') + '.'); return; }
    if (!f.consent.checked) { say('Нужно согласие на обработку персональных данных.'); return; }
    button.disabled = true;
    say('Отправляю…');
    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fio: f.fio.value.trim(),
        phone: f.phone.value.trim(),
        email: f.email.value.trim(),
        telegram: f.telegram.value.trim(),
        message: f.message.value.trim(),
        website: f.website.value,
        consent: true
      })
    }).then(function (r) {
      return r.json().then(function (data) { if (!r.ok || !data.ok) { throw new Error('bad'); } return data; });
    }).then(function (data) {
      say('');
      showSuccess(data.number);
    }).catch(function () {
      say('Не получилось отправить заявку. Напишите или позвоните мне напрямую — контакты внизу страницы.');
    }).then(function () { button.disabled = false; });
  });
})();
