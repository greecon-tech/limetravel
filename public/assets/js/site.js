(function () {
  'use strict';

  var doc = document;
  doc.documentElement.classList.add('js');

  /* ---------- Navigimi ---------- */
  var nav = doc.querySelector('[data-nav]');
  var toggle = doc.querySelector('[data-nav-toggle]');

  function setMenu(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    var use = toggle.querySelector('use');
    if (use) use.setAttribute('href', '/assets/img/icons.svg#' + (open ? 'close' : 'menu'));
  }

  if (nav && toggle) {
    toggle.addEventListener('click', function () {
      setMenu(!nav.classList.contains('is-open'));
    });
    nav.querySelectorAll('.nav__links a').forEach(function (link) {
      link.addEventListener('click', function () {
        setMenu(false);
      });
    });
    doc.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenu(false);
        toggle.focus();
      }
    });
    var onScroll = function () {
      nav.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Zgjedhësi i gjuhës ---------- */
  var langMenu = doc.querySelector('[data-lang]');
  if (langMenu) {
    doc.addEventListener('click', function (event) {
      if (!langMenu.contains(event.target)) langMenu.open = false;
    });
    doc.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && langMenu.open) {
        langMenu.open = false;
        langMenu.querySelector('summary').focus();
      }
    });
  }

  /* ---------- Shfaqja gjatë lëvizjes ---------- */
  var reveals = doc.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    reveals.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add('is-in');
    });
  }

  /* ---------- Formulari i kërkesës ---------- */
  var form = doc.querySelector('[data-request-form]');
  if (!form) return;

  var config = doc.body.dataset;
  var T = {};
  try {
    T = JSON.parse(form.dataset.strings || '{}');
  } catch (error) {
    T = {};
  }
  function t(key, vars) {
    var text = T[key] || '';
    for (var name in vars) text = text.replace('{' + name + '}', vars[name]);
    return text;
  }
  var preview = form.querySelector('[data-preview]');
  var status = form.querySelector('[data-status]');
  var dateFrom = form.elements.dateFrom;
  var dateTo = form.elements.dateTo;
  var dateError = doc.getElementById('f-date-error');

  var today = new Date();
  var todayIso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  dateFrom.min = todayIso;
  dateTo.min = todayIso;

  function formatDate(iso) {
    if (!iso) return '';
    var parts = iso.split('-');
    return parts[2] + '.' + parts[1] + '.' + parts[0];
  }

  function value(name) {
    return (form.elements[name].value || '').trim();
  }

  function buildMessage() {
    var lines = [t('greeting'), ''];
    var add = function (label, text) {
      if (text) lines.push('• ' + label + ': ' + text);
    };

    add(t('destination'), value('destination'));

    var from = formatDate(dateFrom.value);
    var to = formatDate(dateTo.value);
    var dates = from && to ? from + ' – ' + to : from ? t('dates_from', { date: from }) : to ? t('dates_to', { date: to }) : '';
    if (form.elements.flexible.checked) dates = dates ? dates + ' (' + t('flexible') + ')' : t('flexible');
    add(t('dates'), dates);

    add(t('origin'), value('origin'));

    var adults = parseInt(form.elements.adults.value, 10) || 0;
    var children = parseInt(form.elements.children.value, 10) || 0;
    var travellers = [];
    if (adults > 0) travellers.push(t(adults === 1 ? 'adults_one' : 'adults_other', { n: adults }));
    if (children > 0) travellers.push(t(children === 1 ? 'children_one' : 'children_other', { n: children }));
    add(t('travellers'), travellers.join(', '));

    add(t('budget'), value('budget'));

    var priorities = Array.prototype.filter
      .call(form.querySelectorAll('input[name="priority"]'), function (input) {
        return input.checked;
      })
      .map(function (input) {
        return input.value;
      });
    add(t('priority'), priorities.join(', '));

    add(t('notes'), value('notes'));

    var name = value('name');
    if (name) lines.push('', t('thanks'), name);
    return lines.join('\n');
  }

  function validDates() {
    var invalid = Boolean(dateFrom.value && dateTo.value && dateTo.value < dateFrom.value);
    dateError.hidden = !invalid;
    if (invalid) dateTo.setAttribute('aria-invalid', 'true');
    else dateTo.removeAttribute('aria-invalid');
    return !invalid;
  }

  function update() {
    if (dateFrom.value) dateTo.min = dateFrom.value;
    validDates();
    preview.value = buildMessage();
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      preview.focus();
      preview.select();
      try {
        doc.execCommand('copy') ? resolve() : reject(new Error('copy'));
      } catch (error) {
        reject(error);
      }
    });
  }

  function say(message) {
    status.textContent = message;
  }

  function send(channel) {
    if (!validDates()) {
      dateTo.focus();
      return;
    }
    var message = buildMessage();
    var encoded = encodeURIComponent(message);

    if (channel === 'whatsapp') {
      window.open('https://wa.me/' + config.whatsapp + '?text=' + encoded, '_blank', 'noopener');
      say(t('opening_whatsapp'));
      return;
    }
    if (channel === 'email') {
      window.location.href =
        'mailto:' + config.email + '?subject=' + encodeURIComponent(t('subject')) + '&body=' + encoded;
      say(t('opening_email'));
      return;
    }

    copy(message).then(
      function () {
        say(t('copied'));
      },
      function () {
        preview.focus();
        preview.select();
        say(t('copy_failed'));
      }
    );
  }

  if (config.whatsapp) form.querySelector('[data-send="whatsapp"]').hidden = false;
  if (config.email) form.querySelector('[data-send="email"]').hidden = false;
  if (!config.whatsapp) {
    // Pa WhatsApp, butoni i parë i dukshëm bëhet kryesor.
    var first = config.email ? form.querySelector('[data-send="email"]') : form.querySelector('[data-send="copy"]');
    first.classList.replace('btn--ghost', 'btn--primary');
  }

  form.addEventListener('input', update);
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    send(config.whatsapp ? 'whatsapp' : config.email ? 'email' : 'copy');
  });
  form.querySelectorAll('button[data-send]').forEach(function (button) {
    if (button.type === 'submit') return;
    button.addEventListener('click', function () {
      send(button.dataset.send);
    });
  });

  update();
})();
