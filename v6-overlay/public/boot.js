(function (window, document) {
  'use strict';

  var screen = document.getElementById('bootScreen');
  var title = document.getElementById('bootTitle');
  var message = document.getElementById('bootMessage');
  var progress = document.getElementById('bootProgress');
  var actions = document.getElementById('bootActions');
  var finished = false;
  var safeMode = false;

  try {
    safeMode = localStorage.getItem('wildforgeSafeMode') === '1';
  } catch (error) {
    console.warn('Wildforge storage is unavailable', error);
  }

  function setText(element, value) {
    if (element) element.textContent = value;
  }

  function stage(value, percentage) {
    if (finished) return;
    setText(message, value);
    if (progress && typeof percentage === 'number') {
      progress.style.width = Math.max(8, Math.min(100, percentage)) + '%';
    }
  }

  function coreIsReady() {
    var heroes = document.querySelectorAll('#heroes .hero');
    return typeof window.start === 'function' &&
      typeof window.show === 'function' &&
      heroes.length === 4;
  }

  function addSafeModeBadge() {
    if (!safeMode || document.getElementById('safeModeBadge')) return;
    var badge = document.createElement('button');
    badge.id = 'safeModeBadge';
    badge.type = 'button';
    badge.textContent = 'VEILIGE MODUS · HERSTEL VOLLEDIGE MODUS';
    badge.addEventListener('click', function () { window.WildforgeBoot.retry(); });
    document.body.appendChild(badge);
  }

  function ready(label) {
    if (finished) return;
    if (!coreIsReady()) {
      fail(new Error('De spelkern antwoordt niet.'), 'De engine kon niet starten');
      return;
    }
    finished = true;
    document.body.classList.add('wildforge-ready');
    if (safeMode) document.body.classList.add('wildforge-safe-mode');
    setText(title, 'WILDFORGE');
    setText(message, label || (safeMode ? 'Veilige engine gereed' : 'De Hollow ontwaakt'));
    if (progress) progress.style.width = '100%';
    console.info('WILDFORGE_BOOT_READY', safeMode ? 'safe' : 'full');
    setTimeout(function () {
      if (screen) screen.classList.add('boot-hidden');
      addSafeModeBadge();
    }, 260);
  }

  function fail(error, friendlyMessage) {
    if (finished) return;
    var detail = error && error.message ? error.message : String(error || 'Onbekende fout');
    document.body.classList.add('wildforge-boot-failed');
    if (screen) screen.classList.add('boot-error');
    setText(title, 'STARTPROBLEEM');
    setText(message, (friendlyMessage || 'Wildforge kon niet volledig laden') + '\n' + detail);
    if (progress) progress.style.width = '100%';
    if (actions) actions.hidden = false;
    console.error('WILDFORGE_BOOT_FAILED', detail);
  }

  function settle(tasks) {
    return Promise.all(tasks.map(function (task) {
      return Promise.resolve(task).catch(function () { return null; });
    }));
  }

  function clearWebCaches() {
    var tasks = [];
    if ('serviceWorker' in navigator) {
      tasks.push(navigator.serviceWorker.getRegistrations().then(function (registrations) {
        return settle(registrations.map(function (registration) { return registration.unregister(); }));
      }));
    }
    if ('caches' in window) {
      tasks.push(caches.keys().then(function (keys) {
        return settle(keys.map(function (key) { return caches.delete(key); }));
      }));
    }
    return settle(tasks);
  }

  function reloadWithMode(useSafeMode) {
    stage('Lokale bestanden herstellen…', 86);
    try {
      if (useSafeMode) localStorage.setItem('wildforgeSafeMode', '1');
      else localStorage.removeItem('wildforgeSafeMode');
    } catch (error) {
      console.warn('Wildforge mode could not be saved', error);
    }
    clearWebCaches().finally(function () { location.reload(); });
  }

  window.WildforgeBoot = {
    safeMode: safeMode,
    stage: stage,
    ready: ready,
    fail: fail,
    retry: function () { reloadWithMode(false); },
    safe: function () { reloadWithMode(true); }
  };

  window.addEventListener('error', function (event) {
    if (event && event.error) fail(event.error, 'Er ging iets mis tijdens het laden');
  });
  window.addEventListener('unhandledrejection', function (event) {
    if (!finished) fail(event.reason, 'Een onderdeel reageerde niet');
  });

  stage(safeMode ? 'Veilige engine voorbereiden…' : 'Spelkern laden…', 24);
  setTimeout(function () {
    if (!finished) fail(new Error('Time-out na 15 seconden.'), 'Het laden duurde te lang');
  }, 15000);
})(window, document);
