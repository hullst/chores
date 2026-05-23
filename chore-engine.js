// =============================================
// CHORE ENGINE  (shared by index.html + admin.html)
// Single source of truth for the roster + the default
// chore generation. Days auto-generate from here unless a
// per-day override ("assignments") exists in Firestore.
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
  var MORNING_ROTATION = [
    { label: 'Vacuum living room', icon: '🧹' },
    { label: 'Vacuum front room',  icon: '🧹' },
    { label: 'Load dishwasher',    icon: '🍽️' },
    { label: 'Empty dishwasher',   icon: '🍽️' },
  ];
  var EVENING_ROTATION = [
    { label: 'Wipe kitchen counter', icon: '🧽' },
    { label: 'Wipe kitchen table',   icon: '🧹' },
    { label: 'Tineco kitchen floor', icon: '🤖' },
    { label: 'Take out trash',       icon: '🗑️' },
  ];

  function getRotationIndex(dateObj) {
    var msPerDay = 24 * 60 * 60 * 1000;
    var diff = Math.floor((dateObj - ROTATION_EPOCH) / msPerDay);
    return ((diff % 4) + 4) % 4;
  }

  function getRotatedChore(bigKidIndex, rotIdx, arr) {
    return arr[(rotIdx + bigKidIndex) % 4];
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
    if (override) return override; // saturday, sunday, weekday
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

  // Parse a Firestore day-doc id into { dayType, date }.
  function parseKey(key) {
    var us = key.indexOf('_');
    var dayType = us === -1 ? key : key.slice(0, us);
    var rest = us === -1 ? '' : key.slice(us + 1);
    var date;
    if (!rest || rest === 'test') date = new Date();
    else { date = new Date(rest); if (isNaN(date)) date = new Date(); }
    return { dayType: dayType, date: date };
  }

  // ---- default builders (mirror the original index.html logic) ----

  function buildWeekdayChores(kidId, dateObj) {
    var chores = [];
    var isBig = BIG_KIDS.indexOf(kidId) !== -1;
    var bigIdx = BIG_KIDS.indexOf(kidId);
    var rotIdx = getRotationIndex(dateObj);
    var dow = dateObj.getDay();

    chores.push({ tod: 'morning', label: 'Make bed',                    icon: '🛏️' });
    chores.push({ tod: 'morning', label: 'Brush teeth',                 icon: '🪥' });
    chores.push({ tod: 'morning', label: 'Eat breakfast',               icon: '🥣' });
    chores.push({ tod: 'morning', label: 'Bring plates to sink',        icon: '🫧' });
    chores.push({ tod: 'morning', label: 'Go kiss Momma good morning!', icon: '💋' });

    var WEEKDAY_MORNING_ROTATION = ['theodore', 'alice', 'andrew', 'felix'];
    if (kidId === WEEKDAY_MORNING_ROTATION[rotIdx % 4]) {
      chores.push({ tod: 'morning', label: 'Empty dishwasher', icon: '🍽️' });
    }

    if (isBig) chores.push({ tod: 'morning', label: 'Pack lunch', icon: '🥪' });
    var lucyLeoDay = (dow === 1 || dow === 3 || dow === 5);
    if (kidId === 'lucy' || kidId === 'leo') {
      if (lucyLeoDay) chores.push({ tod: 'morning', label: 'Pack snack', icon: '🍎' });
    } else {
      chores.push({ tod: 'morning', label: 'Pack snack', icon: '🍎' });
    }

    chores.push({ tod: 'evening', label: 'Eat dinner',                  icon: '🍽️' });
    chores.push({ tod: 'evening', label: 'Bring dinner plates to sink', icon: '🫧' });

    var WEEKDAY_EVENING_ROTATION = [
      { label: 'Load dishwasher',           icon: '🍽️' },
      { label: 'Wipe down kitchen table',   icon: '🧹' },
      { label: 'Wipe down kitchen counter', icon: '🧽' },
      { label: 'Load dishwasher',           icon: '🍽️' },
    ];
    if (isBig) {
      var ec = WEEKDAY_EVENING_ROTATION[(rotIdx + bigIdx) % 4];
      chores.push({ tod: 'evening', label: ec.label, icon: ec.icon });
    }

    if (kidId === 'felix' || kidId === 'andrew') {
      chores.push({ tod: 'evening', label: 'Read', icon: '📖' });
    }

    return chores;
  }

  function buildSaturdayChores(kidId) {
    var chores = [];
    var everyoneMorning = ['Make bed', 'Brush teeth', 'Get dressed', 'Eat breakfast', 'Bring plates to sink'];
    var morningIcons    = ['🛏️', '🪥', '👕', '🥣', '🫧'];
    for (var i = 0; i < everyoneMorning.length; i++) {
      chores.push({ tod: 'morning', section: 'Everyone', label: everyoneMorning[i], icon: morningIcons[i] });
    }
    if (kidId === 'theodore') { chores.push({ tod: 'morning', section: 'Family Chores', label: 'Unload dishwasher', icon: '🍽️' }); chores.push({ tod: 'morning', section: 'Family Chores', label: 'Wipe bathroom sink', icon: '🚿' }); }
    if (kidId === 'alice' || kidId === 'lucy')   chores.push({ tod: 'morning', section: 'Family Chores', label: 'Wipe bathroom sink', icon: '🚿' });
    if (kidId === 'andrew' || kidId === 'felix') chores.push({ tod: 'morning', section: 'Family Chores', label: 'Wipe bathroom sink', icon: '🚿' });
    if (kidId === 'leo')    chores.push({ tod: 'morning', section: 'Family Chores', label: 'Wipe bathroom sink', icon: '🚿' });
    if (kidId === 'alice')  chores.push({ tod: 'morning', section: 'Family Chores', label: 'Vacuum living room', icon: '🧹' });
    if (kidId === 'andrew') chores.push({ tod: 'morning', section: 'Family Chores', label: 'Vacuum front room', icon: '🧹' });
    if (kidId === 'lucy' || kidId === 'leo') chores.push({ tod: 'morning', section: 'Family Chores', label: 'Put away blankets', icon: '🛋️' });
    if (kidId === 'felix')  chores.push({ tod: 'morning', section: 'Family Chores', label: "Fill up Sophie's food & water", icon: '🐾' });
    chores.push({ tod: 'morning', section: '❤️ Special', label: 'Go kiss Momma good morning!', icon: '💋' });

    chores.push({ tod: 'afternoon', section: 'Everyone', label: 'Eat lunch', icon: '🥪' });
    chores.push({ tod: 'afternoon', section: 'Everyone', label: 'Bring lunch plates to sink', icon: '🫧' });
    chores.push({ tod: 'afternoon', section: 'Everyone', label: 'Help fold laundry', icon: '👕' });
    chores.push({ tod: 'afternoon', section: 'Everyone', label: 'Put away lunch stuff', icon: '🧹' });
    if (kidId === 'andrew') { chores.push({ tod: 'afternoon', section: 'Clean Up', label: 'Load dishwasher', icon: '🫧' }); chores.push({ tod: 'afternoon', section: 'Clean Up', label: 'Take out recyclables', icon: '♻️' }); }
    if (kidId === 'theodore') chores.push({ tod: 'afternoon', section: 'Bathrooms', label: 'Clean pool bathroom', icon: '🚿' });
    if (kidId === 'alice')    chores.push({ tod: 'afternoon', section: 'Bathrooms', label: 'Clean front bathroom', icon: '🚿' });
    if (kidId === 'felix')    chores.push({ tod: 'afternoon', section: 'Bathrooms', label: 'Clean basement bathroom', icon: '🚿' });

    chores.push({ tod: 'evening', section: 'Everyone', label: 'Eat dinner', icon: '🍽️' });
    chores.push({ tod: 'evening', section: 'Everyone', label: 'Bring dinner plates to sink', icon: '🫧' });
    chores.push({ tod: 'evening', section: 'Everyone', label: 'Eat dessert', icon: '🍨' });
    if (kidId === 'theodore') chores.push({ tod: 'evening', section: 'Clean Up', label: 'Take out trash', icon: '🗑️' });
    if (kidId === 'alice')    chores.push({ tod: 'evening', section: 'Clean Up', label: 'Load dishwasher', icon: '🍽️' });
    if (kidId === 'andrew')   chores.push({ tod: 'evening', section: 'Clean Up', label: 'Take out recyclables', icon: '♻️' });
    if (kidId === 'felix')    chores.push({ tod: 'evening', section: 'Clean Up', label: 'Load dishwasher', icon: '🍽️' });
    if (kidId === 'lucy')     chores.push({ tod: 'evening', section: 'Clean Up', label: 'Wipe kitchen table', icon: '🧹' });
    return chores;
  }

  function buildSundayChores(kidId, dateObj) {
    var chores = [];
    var bigIdx = BIG_KIDS.indexOf(kidId);
    var rotIdx = getRotationIndex(dateObj);
    var everyoneMorning = ['Make bed', 'Brush teeth', 'Get dressed for church', 'Eat breakfast', 'Bring plates to sink'];
    var morningIcons    = ['🛏️', '🪥', '⛪', '🥣', '🫧'];
    for (var i = 0; i < everyoneMorning.length; i++) {
      chores.push({ tod: 'morning', section: 'Everyone', label: everyoneMorning[i], icon: morningIcons[i] });
    }
    if (bigIdx !== -1) { var mc = getRotatedChore(bigIdx, rotIdx, MORNING_ROTATION); chores.push({ tod: 'morning', section: 'Family Chores', label: mc.label, icon: mc.icon }); }
    if (kidId === 'lucy' || kidId === 'leo') chores.push({ tod: 'morning', section: 'Family Chores', label: 'Put away blankets', icon: '🛋️' });
    chores.push({ tod: 'morning', section: '❤️ Special', label: 'Go kiss Momma good morning!', icon: '💋' });
    chores.push({ tod: 'afternoon', section: 'Everyone', label: 'Eat lunch', icon: '🥪' });
    chores.push({ tod: 'afternoon', section: 'Everyone', label: 'Bring lunch plates to sink', icon: '🫧' });
    chores.push({ tod: 'afternoon', section: 'Everyone', label: 'Put away lunch stuff', icon: '🧹' });
    chores.push({ tod: 'evening', section: 'Everyone', label: 'Eat dinner', icon: '🍽️' });
    chores.push({ tod: 'evening', section: 'Everyone', label: 'Bring dinner plates to sink', icon: '🫧' });
    chores.push({ tod: 'evening', section: 'Everyone', label: 'Eat dessert', icon: '🍨' });
    if (bigIdx !== -1) { var ec = getRotatedChore(bigIdx, rotIdx, EVENING_ROTATION); chores.push({ tod: 'evening', section: 'Clean Up', label: ec.label, icon: ec.icon }); }
    return chores;
  }

  function slim(chore) { return { tod: chore.tod, label: chore.label, icon: chore.icon }; }

  // Generate the default chores for a kid for a given day type + date.
  function generate(kidId, dayType, dateObj) {
    dayType = dayType || getDayType();
    dateObj = dateObj || new Date();
    var raw;
    if (dayType === 'sunday')        raw = buildSundayChores(kidId, dateObj);
    else if (dayType === 'saturday') raw = buildSaturdayChores(kidId);
    else                             raw = buildWeekdayChores(kidId, dateObj);
    return raw.map(slim);
  }

  // Generate defaults for every kid for a given day-doc key -> { kidId: [chores] }.
  function generateAllForKey(key) {
    var info = parseKey(key);
    var out = {};
    KIDS.forEach(function (kid) {
      out[kid.id] = generate(kid.id, info.dayType, info.date);
    });
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
  };
})(window);
