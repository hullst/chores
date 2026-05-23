// =============================================
// CHORE ENGINE  (shared by index.html + admin.html)
//
// Single source of truth for the roster + chore generation.
// The recurring defaults live as data in DEFAULT_TEMPLATES and are
// interpreted at runtime. They can be overridden per-installation by a
// `templates` doc in Firestore (see setConfig), which the admin page
// edits. A specific day can still override everything via per-day
// "assignments" (handled by the pages, not here).
// =============================================
(function (global) {
  'use strict';

  var KIDS = [
    { id: 'theodore', name: 'Theodore', age: 11, big: true,  emoji: '🦁' },
    { id: 'alice',    name: 'Alice',    age: 9,  big: true,  emoji: '🦋' },
    { id: 'andrew',   name: 'Andrew',   age: 8,  big: true,  emoji: '🚀' },
    { id: 'felix',    name: 'Felix',    age: 6,  big: true,  emoji: '🐸' },
    { id: 'lucy',     name: 'Lucy',     age: 5,  big: false, emoji: '🌸' },
    { id: 'leo',      name: 'Leo',      age: 3,  big: false, emoji: '🐻' },
  ];

  var BIG_KIDS  = KIDS.filter(function (k) { return k.big; }).map(function (k) { return k.id; });
  var TOD_ORDER = ['morning', 'afternoon', 'evening'];
  var TOD_LABELS = { morning: '🌅 Morning', afternoon: '☀️ Afternoon', evening: '🌆 Evening' };
  var ROTATION_EPOCH = new Date('2025-03-01T00:00:00');

  // ---- DEFAULT recurring templates (data form of the old builders) ----
  // Rule shapes:
  //   { type:'fixed',      tod, label, icon, who, dow? }
  //       who: 'all' | 'big' | 'small' | [kidId,...]
  //       dow: optional [0-6] day-of-week filter (0=Sun). Empty/absent = every day.
  //   { type:'rotateOne',  tod, label, icon, pool:[kidId,...] }
  //       exactly one kid (pool[rotIdx % pool.length]) gets it each day.
  //   { type:'rotateEach', tod, pool:[kidId,...], chores:[{label,icon},...] }
  //       each kid in pool gets chores[(rotIdx + poolIndex) % chores.length].
  var DEFAULT_TEMPLATES = {
    version: 1,
    dayTypes: {
      weekday: { rules: [
        { type: 'fixed', tod: 'morning', who: 'all', label: 'Make bed',                    icon: '🛏️' },
        { type: 'fixed', tod: 'morning', who: 'all', label: 'Brush teeth',                 icon: '🪥' },
        { type: 'fixed', tod: 'morning', who: 'all', label: 'Eat breakfast',               icon: '🥣' },
        { type: 'fixed', tod: 'morning', who: 'all', label: 'Bring plates to sink',        icon: '🫧' },
        { type: 'fixed', tod: 'morning', who: 'all', label: 'Go kiss Momma good morning!', icon: '💋' },
        { type: 'rotateOne', tod: 'morning', pool: ['theodore', 'alice', 'andrew', 'felix'], label: 'Empty dishwasher', icon: '🍽️' },
        { type: 'fixed', tod: 'morning', who: 'big', label: 'Pack lunch', icon: '🥪' },
        { type: 'fixed', tod: 'morning', who: 'big', label: 'Pack snack', icon: '🍎' },
        { type: 'fixed', tod: 'morning', who: ['lucy', 'leo'], dow: [1, 3, 5], label: 'Pack snack', icon: '🍎' },
        { type: 'fixed', tod: 'evening', who: 'all', label: 'Eat dinner',                  icon: '🍽️' },
        { type: 'fixed', tod: 'evening', who: 'all', label: 'Bring dinner plates to sink', icon: '🫧' },
        { type: 'rotateEach', tod: 'evening', pool: ['theodore', 'alice', 'andrew', 'felix'], chores: [
          { label: 'Load dishwasher',           icon: '🍽️' },
          { label: 'Wipe down kitchen table',   icon: '🧹' },
          { label: 'Wipe down kitchen counter', icon: '🧽' },
          { label: 'Load dishwasher',           icon: '🍽️' },
        ] },
        { type: 'fixed', tod: 'evening', who: ['felix', 'andrew'], label: 'Read', icon: '📖' },
      ] },
      saturday: { rules: [
        { type: 'fixed', tod: 'morning', who: 'all', label: 'Make bed',             icon: '🛏️' },
        { type: 'fixed', tod: 'morning', who: 'all', label: 'Brush teeth',          icon: '🪥' },
        { type: 'fixed', tod: 'morning', who: 'all', label: 'Get dressed',          icon: '👕' },
        { type: 'fixed', tod: 'morning', who: 'all', label: 'Eat breakfast',        icon: '🥣' },
        { type: 'fixed', tod: 'morning', who: 'all', label: 'Bring plates to sink', icon: '🫧' },
        { type: 'fixed', tod: 'morning', who: ['theodore'], label: 'Unload dishwasher', icon: '🍽️' },
        { type: 'fixed', tod: 'morning', who: 'all', label: 'Wipe bathroom sink', icon: '🚿' },
        { type: 'fixed', tod: 'morning', who: ['alice'],  label: 'Vacuum living room', icon: '🧹' },
        { type: 'fixed', tod: 'morning', who: ['andrew'], label: 'Vacuum front room',  icon: '🧹' },
        { type: 'fixed', tod: 'morning', who: ['lucy', 'leo'], label: 'Put away blankets', icon: '🛋️' },
        { type: 'fixed', tod: 'morning', who: ['felix'], label: "Fill up Sophie's food & water", icon: '🐾' },
        { type: 'fixed', tod: 'morning', who: 'all', label: 'Go kiss Momma good morning!', icon: '💋' },
        { type: 'fixed', tod: 'afternoon', who: 'all', label: 'Eat lunch',                  icon: '🥪' },
        { type: 'fixed', tod: 'afternoon', who: 'all', label: 'Bring lunch plates to sink', icon: '🫧' },
        { type: 'fixed', tod: 'afternoon', who: 'all', label: 'Help fold laundry',          icon: '👕' },
        { type: 'fixed', tod: 'afternoon', who: 'all', label: 'Put away lunch stuff',       icon: '🧹' },
        { type: 'fixed', tod: 'afternoon', who: ['andrew'], label: 'Load dishwasher',     icon: '🫧' },
        { type: 'fixed', tod: 'afternoon', who: ['andrew'], label: 'Take out recyclables', icon: '♻️' },
        { type: 'fixed', tod: 'afternoon', who: ['theodore'], label: 'Clean pool bathroom',     icon: '🚿' },
        { type: 'fixed', tod: 'afternoon', who: ['alice'],    label: 'Clean front bathroom',    icon: '🚿' },
        { type: 'fixed', tod: 'afternoon', who: ['felix'],    label: 'Clean basement bathroom', icon: '🚿' },
        { type: 'fixed', tod: 'evening', who: 'all', label: 'Eat dinner',                  icon: '🍽️' },
        { type: 'fixed', tod: 'evening', who: 'all', label: 'Bring dinner plates to sink', icon: '🫧' },
        { type: 'fixed', tod: 'evening', who: 'all', label: 'Eat dessert',                 icon: '🍨' },
        { type: 'fixed', tod: 'evening', who: ['theodore'], label: 'Take out trash',       icon: '🗑️' },
        { type: 'fixed', tod: 'evening', who: ['alice'],    label: 'Load dishwasher',      icon: '🍽️' },
        { type: 'fixed', tod: 'evening', who: ['andrew'],   label: 'Take out recyclables', icon: '♻️' },
        { type: 'fixed', tod: 'evening', who: ['felix'],    label: 'Load dishwasher',      icon: '🍽️' },
        { type: 'fixed', tod: 'evening', who: ['lucy'],     label: 'Wipe kitchen table',   icon: '🧹' },
      ] },
      sunday: { rules: [
        { type: 'fixed', tod: 'morning', who: 'all', label: 'Make bed',                icon: '🛏️' },
        { type: 'fixed', tod: 'morning', who: 'all', label: 'Brush teeth',             icon: '🪥' },
        { type: 'fixed', tod: 'morning', who: 'all', label: 'Get dressed for church',  icon: '⛪' },
        { type: 'fixed', tod: 'morning', who: 'all', label: 'Eat breakfast',           icon: '🥣' },
        { type: 'fixed', tod: 'morning', who: 'all', label: 'Bring plates to sink',    icon: '🫧' },
        { type: 'rotateEach', tod: 'morning', pool: ['theodore', 'alice', 'andrew', 'felix'], chores: [
          { label: 'Vacuum living room', icon: '🧹' },
          { label: 'Vacuum front room',  icon: '🧹' },
          { label: 'Load dishwasher',    icon: '🍽️' },
          { label: 'Empty dishwasher',   icon: '🍽️' },
        ] },
        { type: 'fixed', tod: 'morning', who: ['lucy', 'leo'], label: 'Put away blankets', icon: '🛋️' },
        { type: 'fixed', tod: 'morning', who: 'all', label: 'Go kiss Momma good morning!', icon: '💋' },
        { type: 'fixed', tod: 'afternoon', who: 'all', label: 'Eat lunch',                  icon: '🥪' },
        { type: 'fixed', tod: 'afternoon', who: 'all', label: 'Bring lunch plates to sink', icon: '🫧' },
        { type: 'fixed', tod: 'afternoon', who: 'all', label: 'Put away lunch stuff',       icon: '🧹' },
        { type: 'fixed', tod: 'evening', who: 'all', label: 'Eat dinner',                  icon: '🍽️' },
        { type: 'fixed', tod: 'evening', who: 'all', label: 'Bring dinner plates to sink', icon: '🫧' },
        { type: 'fixed', tod: 'evening', who: 'all', label: 'Eat dessert',                 icon: '🍨' },
        { type: 'rotateEach', tod: 'evening', pool: ['theodore', 'alice', 'andrew', 'felix'], chores: [
          { label: 'Wipe kitchen counter', icon: '🧽' },
          { label: 'Wipe kitchen table',   icon: '🧹' },
          { label: 'Tineco kitchen floor', icon: '🤖' },
          { label: 'Take out trash',       icon: '🗑️' },
        ] },
      ] },
    },
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // Active config — defaults until a Firestore `templates` doc is applied.
  var activeConfig = clone(DEFAULT_TEMPLATES);

  function setConfig(cfg) {
    if (cfg && cfg.dayTypes && cfg.dayTypes.weekday && cfg.dayTypes.saturday && cfg.dayTypes.sunday) {
      activeConfig = clone(cfg);
    } else {
      activeConfig = clone(DEFAULT_TEMPLATES);
    }
  }
  function getConfig() { return clone(activeConfig); }
  function getDefaultConfig() { return clone(DEFAULT_TEMPLATES); }

  function kidById(id) {
    for (var i = 0; i < KIDS.length; i++) if (KIDS[i].id === id) return KIDS[i];
    return null;
  }

  function getRotationIndex(dateObj) {
    var msPerDay = 24 * 60 * 60 * 1000;
    var diff = Math.floor((dateObj - ROTATION_EPOCH) / msPerDay);
    return ((diff % 4) + 4) % 4;
  }

  function getDateString(d) {
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function getUrlDayOverride() {
    try {
      var p = new URLSearchParams(global.location.search).get('day');
      if (p) return p.toLowerCase();
    } catch (e) {}
    return null;
  }

  function getDayType() {
    var override = getUrlDayOverride();
    if (override) return override;
    var d = new Date().getDay();
    if (d === 6) return 'saturday';
    if (d === 0) return 'sunday';
    return 'weekday';
  }

  function isSunday() { return getDayType() === 'sunday'; }

  function getTodayKey() {
    var d = new Date();
    var dt = getDayType();
    var override = getUrlDayOverride();
    if (dt === 'sunday')   return 'sunday_'   + (override === 'sunday'   ? 'test' : getDateString(d));
    if (dt === 'saturday') return 'saturday_' + (override === 'saturday' ? 'test' : getDateString(d));
    return 'weekday_' + getDateString(d);
  }

  function parseKey(key) {
    var us = key.indexOf('_');
    var dayType = us === -1 ? key : key.slice(0, us);
    var rest = us === -1 ? '' : key.slice(us + 1);
    var date;
    if (!rest || rest === 'test') date = new Date();
    else { date = new Date(rest); if (isNaN(date)) date = new Date(); }
    return { dayType: dayType, date: date };
  }

  function whoMatches(who, kid) {
    if (who === 'all') return true;
    if (who === 'big') return !!kid.big;
    if (who === 'small') return !kid.big;
    if (Array.isArray(who)) return who.indexOf(kid.id) !== -1;
    return false;
  }

  // Interpret the active rules for one kid on a given day type + date.
  function generate(kidId, dayType, dateObj) {
    dayType = dayType || getDayType();
    dateObj = dateObj || new Date();
    var kid = kidById(kidId);
    if (!kid) return [];
    var def = activeConfig.dayTypes[dayType];
    if (!def || !def.rules) return [];
    var rotIdx = getRotationIndex(dateObj);
    var dow = dateObj.getDay();
    var out = [];
    def.rules.forEach(function (r) {
      if (r.type === 'rotateOne') {
        var pool = r.pool || [];
        if (pool.length && pool[rotIdx % pool.length] === kidId) {
          out.push({ tod: r.tod, label: r.label, icon: r.icon });
        }
      } else if (r.type === 'rotateEach') {
        var p = r.pool || [];
        var idx = p.indexOf(kidId);
        var list = r.chores || [];
        if (idx !== -1 && list.length) {
          var ch = list[(rotIdx + idx) % list.length];
          out.push({ tod: r.tod, label: ch.label, icon: ch.icon });
        }
      } else { // fixed
        if (!whoMatches(r.who, kid)) return;
        if (r.dow && r.dow.length && r.dow.indexOf(dow) === -1) return;
        out.push({ tod: r.tod, label: r.label, icon: r.icon });
      }
    });
    return out;
  }

  function generateAllForKey(key) {
    var info = parseKey(key);
    var out = {};
    KIDS.forEach(function (kid) { out[kid.id] = generate(kid.id, info.dayType, info.date); });
    return out;
  }

  global.ChoreEngine = {
    KIDS: KIDS,
    BIG_KIDS: BIG_KIDS,
    TOD_ORDER: TOD_ORDER,
    TOD_LABELS: TOD_LABELS,
    getDayType: getDayType,
    isSunday: isSunday,
    getDateString: getDateString,
    getTodayKey: getTodayKey,
    parseKey: parseKey,
    generate: generate,
    generateAllForKey: generateAllForKey,
    setConfig: setConfig,
    getConfig: getConfig,
    getDefaultConfig: getDefaultConfig,
    kidById: kidById,
  };
})(window);
