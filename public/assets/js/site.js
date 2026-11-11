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
    var lines = ['Përshëndetje LimeTravel! Do të doja një ofertë udhëtimi.', ''];
    var add = function (label, text) {
      if (text) lines.push('• ' + label + ': ' + text);
    };

    add('Destinacioni / ideja', value('destination'));

    var from = formatDate(dateFrom.value);
    var to = formatDate(dateTo.value);
    var dates = from && to ? from + ' – ' + to : from ? 'nga ' + from : to ? 'deri më ' + to : '';
    if (form.elements.flexible.checked) dates = dates ? dates + ' (fleksibël)' : 'fleksibël';
    add('Datat', dates);

    add('Nisja nga', value('origin'));

    var adults = parseInt(form.elements.adults.value, 10) || 0;
    var children = parseInt(form.elements.children.value, 10) || 0;
    var travellers = [];
    if (adults > 0) travellers.push(adults + (adults === 1 ? ' i rritur' : ' të rritur'));
    if (children > 0) travellers.push(children + ' fëmijë');
    add('Udhëtarët', travellers.join(', '));

    add('Buxheti orientues', value('budget'));

    var priorities = Array.prototype.filter
      .call(form.querySelectorAll('input[name="priority"]'), function (input) {
        return input.checked;
      })
      .map(function (input) {
        return input.value;
      });
    add('Më e rëndësishmja', priorities.join(', '));

    add('Shënime', value('notes'));

    var name = value('name');
    if (name) lines.push('', 'Faleminderit,', name);
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
      say('Po hapet WhatsApp me mesazhin tuaj gati.');
      return;
    }
    if (channel === 'email') {
      window.location.href =
        'mailto:' + config.email + '?subject=' + encodeURIComponent('Kërkesë për ofertë udhëtimi') + '&body=' + encoded;
      say('Po hapet email-i me mesazhin tuaj gati.');
      return;
    }

    var opened = null;
    if (channel === 'instagram') {
      opened = window.open('https://ig.me/m/' + encodeURIComponent(config.instagram), '_blank', 'noopener');
    }
    copy(message).then(
      function () {
        say(
          channel === 'instagram'
            ? 'Mesazhi u kopjua. Ngjiteni në bisedën e Instagramit me @' + config.instagram + ' dhe dërgojeni.'
            : 'Mesazhi u kopjua.'
        );
      },
      function () {
        preview.focus();
        preview.select();
        say('Nuk u kopjua automatikisht. Mesazhi është i përzgjedhur — kopjojeni dhe na e dërgoni.');
      }
    );
    return opened;
  }

  if (config.whatsapp) form.querySelector('[data-send="whatsapp"]').hidden = false;
  if (config.email) form.querySelector('[data-send="email"]').hidden = false;

  form.addEventListener('input', update);
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    send('instagram');
  });
  form.querySelectorAll('button[data-send]').forEach(function (button) {
    if (button.type === 'submit') return;
    button.addEventListener('click', function () {
      send(button.dataset.send);
    });
  });

  update();
})();
