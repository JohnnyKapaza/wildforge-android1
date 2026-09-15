const fs = require('fs');
const path = require('path');
const vm = require('vm');

const publicDir = process.argv[2];
if (!publicDir) throw new Error('Pass the generated public directory as the first argument.');

const v6Css = fs.readFileSync(path.join(publicDir, 'v6.css'), 'utf8');
const v7Css = fs.readFileSync(path.join(publicDir, 'v7.css'), 'utf8');
const shellRule = v6Css.match(/body\.wildforge-v6:before\s*\{([^}]*)\}/);
if (!shellRule || !/z-index:\s*-1\b/.test(shellRule[1])) {
  throw new Error('The cinematic background must stay behind the game interface.');
}
if (!/grid-template-areas:\s*"hero enemies"/.test(v7Css)) {
  throw new Error('Combat must keep the hero left and enemies right.');
}
if (!/#mapViewport\s*\{[^}]*overflow-y:\s*auto/s.test(v7Css)) {
  throw new Error('The world map must scroll vertically.');
}
if (!/#combat\s*>\s*\.hand\s+\.card:before\s*\{[^}]*display:\s*none!important/s.test(v7Css)) {
  throw new Error('The duplicate card artwork layer must be disabled.');
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
    this.style = { width: '', height: '', setProperty() {} };
    this.textContent = '';
    this.innerHTML = '';
    this.hidden = false;
    this.disabled = false;
    this.clientHeight = 400;
    this.clientWidth = 915;
    this.scrollLeft = 0;
    this.scrollTop = 0;
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
if ((html.match(/<script src="v6\.js"><\/script>/g) || []).length !== 1 ||
    (html.match(/<script src="v7\.js"><\/script>/g) || []).length !== 1) {
  throw new Error('The combat/map overlays must be loaded exactly once.');
}
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

for (const name of ['boot.js', 'game.js', 'v6.js', 'v7.js']) {
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
assert(body.classList.contains('wildforge-v7'), 'The v0.7 interface layer did not load.');
vm.runInContext("show('select')", context);
assert(elements.select.classList.contains('active'), 'New-run screen did not open.');
vm.runInContext('start(0)', context);
assert(elements.map.classList.contains('active'), 'Hero selection did not start a run.');
assert(storage.wildforge, 'Run state was not persisted.');
for (const timer of timers.filter(item => item.delay < 1000)) timer.callback();
assert(elements.mapViewport['data-route-direction'] === 'bottom-to-top', 'World map direction is not bottom-to-top.');
assert(elements.mapViewport.scrollTop > 0, 'World map did not start at the bottom route nodes.');
assert(/^0 0 915 1[12]\d{2}$/.test(elements.mapLines.viewBox), 'World map viewBox is not a tall vertical route.');
assert(/data-row="11"/.test(elements.mapNodes.innerHTML), 'World map boss node is missing.');
vm.runInContext("G.row=11; G.current='10-2'; renderMap()", context);
assert(/map-node open boss[^>]*data-node-id="11-0"/.test(elements.mapNodes.innerHTML), 'Boss must be reachable from every final route.');

vm.runInContext("beginFight(false,false)", context);
assert(elements.combat.classList.contains('active'), 'Combat did not open after the map redesign.');
assert(/enemy-unit/.test(elements.enemies.innerHTML), 'Combat did not render an enemy formation.');

vm.runInContext("G.pendingNode='0-0'; G.gold=500; shop()", context);
assert(elements.shop.classList.contains('active'), 'Bazaar did not open.');
assert((elements.wares.innerHTML.match(/shop-card-slot/g) || []).length === 4, 'Bazaar must show four fixed card offers.');
const firstStock = elements.wares.innerHTML;
vm.runInContext('shop()', context);
assert(elements.wares.innerHTML === firstStock, 'Bazaar stock rerolled during the same visit.');
assert(/ZELDZAAM RELIEK/.test(elements.relicOffer.innerHTML), 'Bazaar relic offer is missing.');
assert(/Hollow-tonicum/.test(elements.potionOffer.innerHTML), 'Bazaar potion offer is missing.');
const deckBefore = vm.runInContext('G.deck.length', context);
vm.runInContext('buyShopCard(0)', context);
assert(vm.runInContext('G.deck.length', context) === deckBefore + 1, 'Buying a shop card did not update the deck.');
assert(/UITVERKOCHT/.test(elements.wares.innerHTML), 'Purchased shop offer did not stay sold.');
vm.runInContext('removeCardShop()', context);
assert(elements.shopRemoveModal.hidden === false, 'Card-removal chooser did not open.');
assert(/remove-card-option/.test(elements.shopRemoveCards.innerHTML), 'Card-removal chooser has no deck cards.');
vm.runInContext('closeShopRemove()', context);
assert(elements.shopRemoveModal.hidden === true, 'Card-removal chooser did not close.');
assert(!logs.some(entry => entry[0] === 'error'), 'Console error detected.');
console.log('startup runtime smoke: ok');
