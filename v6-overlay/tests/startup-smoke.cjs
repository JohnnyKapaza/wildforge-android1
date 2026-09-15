const fs = require('fs');
const path = require('path');
const vm = require('vm');

const publicDir = process.argv[2];
if (!publicDir) throw new Error('Pass the generated public directory as the first argument.');

const v6Css = fs.readFileSync(path.join(publicDir, 'v6.css'), 'utf8');
const shellRule = v6Css.match(/body\.wildforge-v6:before\s*\{([^}]*)\}/);
if (!shellRule || !/z-index:\s*-1\b/.test(shellRule[1])) {
  throw new Error('The cinematic background must stay behind the game interface.');
}

class ClassList {
  constructor(seed = '') { this.values = new Set(seed.split(/\s+/).filter(Boolean)); }
  add(...values) { values.forEach(value => this.values.add(value)); }
  remove(...values) { values.forEach(value => this.values.delete(value)); }
  toggle(value, force) {
    if (force === undefined) force = !this.values.has(value);
    if (force) this.values.add(value); else this.values.delete(value);
    return force;
  }
  contains(value) { return this.values.has(value); }
}

class Element {
  constructor(id = '', classes = '') {
    this.id = id;
    this.classList = new ClassList(classes);
    this.style = { width: '', setProperty() {} };
    this.textContent = '';
    this.innerHTML = '';
    this.hidden = false;
    this.disabled = false;
    this.clientHeight = 400;
    this.scrollLeft = 0;
    this.children = [];
  }
  setAttribute(key, value) { this[key] = value; }
  appendChild(child) { this.children.push(child); }
  addEventListener() {}
  querySelector() { return null; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
  remove() {}
}

const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const elements = {};
for (const match of html.matchAll(/id="([^"]+)"/g)) elements[match[1]] = new Element(match[1]);
const screenIds = ['title', 'select', 'map', 'combat', 'reward', 'choice', 'shop', 'deck', 'compendium', 'gameover'];
const screens = screenIds.map(id => {
  elements[id].classList.add('screen');
  if (id === 'title') elements[id].classList.add('active');
  return elements[id];
});
elements.ascension.value = '0';

const body = new Element('body');
const foot = new Element('foot');
const document = {
  body,
  getElementById: id => elements[id] || null,
  querySelectorAll(selector) {
    if (selector === '.screen') return screens;
    if (selector === '#heroes .hero') {
      const count = (elements.heroes.innerHTML.match(/class="hero(?:\s|")/g) || []).length;
      return Array.from({ length: count }, () => new Element('', 'hero'));
    }
    return [];
  },
  querySelector: selector => selector === '#title .foot' ? foot : null,
  createElement: tag => new Element(tag)
};

const timers = [];
const storage = {
  removeItem(key) { delete this[key]; },
  getItem(key) { return this[key] ?? null; },
  setItem(key, value) { this[key] = String(value); }
};
const logs = [];
const context = {
  document,
  navigator: { userAgent: 'Android; wv)' },
  localStorage: storage,
  location: { reload() {} },
  innerWidth: 915,
  innerHeight: 412,
  console: {
    log: (...values) => logs.push(['log', ...values]),
    info: (...values) => logs.push(['info', ...values]),
    warn: (...values) => logs.push(['warn', ...values]),
    error: (...values) => logs.push(['error', ...values])
  },
  setTimeout: (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
  clearTimeout() {},
  Promise,
  Math,
  Date,
  JSON,
  Array,
  Object,
  String,
  Number,
  Boolean,
  RegExp,
  Error,
  addEventListener() {},
  removeEventListener() {}
};
context.window = context;
context.getComputedStyle = (element, pseudo) => {
  if (element === body && pseudo === '::before') return { zIndex: '-1' };
  return {
    display: element.classList.contains('screen') && !element.classList.contains('active') ? 'none' : 'flex',
    visibility: 'visible',
    opacity: '1'
  };
};
vm.createContext(context);

for (const name of ['boot.js', 'game.js', 'v6.js']) {
  vm.runInContext(fs.readFileSync(path.join(publicDir, name), 'utf8'), context, { filename: name });
}

function assert(condition, message) {
  if (!condition) throw new Error(message + '\nCaptured logs: ' + JSON.stringify(logs));
}

assert(
  body.classList.contains('wildforge-ready'),
  'Boot manager did not reach ready state. start=' + typeof context.start +
    ', show=' + typeof context.show +
    ', heroes=' + document.querySelectorAll('#heroes .hero').length +
    ', markup=' + elements.heroes.innerHTML.slice(0, 120)
);
assert(context.WildforgeBoot.visible(), 'The title interface is not visibly ready.');
vm.runInContext("show('select')", context);
assert(elements.select.classList.contains('active'), 'New-run screen did not open.');
vm.runInContext('start(0)', context);
assert(elements.map.classList.contains('active'), 'Hero selection did not start a run.');
assert(storage.wildforge, 'Run state was not persisted.');
for (const timer of timers.filter(item => item.delay < 1000)) timer.callback();
assert(!logs.some(entry => entry[0] === 'error'), 'Console error detected.');
console.log('startup runtime smoke: ok');
