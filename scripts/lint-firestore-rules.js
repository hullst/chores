#!/usr/bin/env node
// Lightweight, auth-free syntax/structure lint for firestore.rules.
//
// Why this instead of a real rules-engine check: the Firestore Rules Unit
// Testing library (@firebase/rules-unit-testing) would give a much stronger
// guarantee, but it needs the Firestore emulator (a JVM + a multi-hundred-MB
// download) and this project currently has zero npm/build tooling — no
// package.json, no CI runtime beyond `node`. That's a heavy lift for a small
// family app with one security rules file that changes rarely. `firebase
// deploy --only firestore:rules --dry-run` was ruled out too since it needs
// authenticated `firebase login` credentials, which CI doesn't have.
//
// So this catches the failure mode that actually happens in practice —
// someone hand-edits the rules and leaves a brace/bracket/paren unbalanced,
// or breaks one of the structural pieces every valid rules file needs — by
// parsing the file's delimiter structure and a few required tokens. It is
// NOT a full Firestore Rules language parser and will not catch every
// semantic error (e.g. a typo'd function name). If this project's rules
// grow more complex, revisit and add the real emulator-based test harness.
//
// Usage: node scripts/lint-firestore-rules.js [path-to-rules-file]

const fs = require('fs');
const path = require('path');

const rulesPath = process.argv[2] || path.join(__dirname, '..', 'firestore.rules');
const text = fs.readFileSync(rulesPath, 'utf8');

const errors = [];
const OPEN = { '{': '}', '(': ')', '[': ']' };
const CLOSE = { '}': '{', ')': '(', ']': '[' };

let line = 1;
let col = 0;
const stack = []; // { char, line, col }

let inLineComment = false;
let inBlockComment = false;
let inString = null; // the quote char, or null

for (let i = 0; i < text.length; i++) {
  const ch = text[i];
  const next = text[i + 1];
  col++;

  if (ch === '\n') {
    line++;
    col = 0;
    inLineComment = false;
    continue;
  }

  if (inLineComment) continue;

  if (inBlockComment) {
    if (ch === '*' && next === '/') {
      inBlockComment = false;
      i++;
      col++;
    }
    continue;
  }

  if (inString) {
    if (ch === '\\') {
      i++; // skip escaped char
      col++;
      continue;
    }
    if (ch === inString) inString = null;
    continue;
  }

  if (ch === "'" || ch === '"') {
    inString = ch;
    continue;
  }

  if (ch === '/' && next === '/') {
    inLineComment = true;
    i++;
    col++;
    continue;
  }

  if (ch === '/' && next === '*') {
    inBlockComment = true;
    i++;
    col++;
    continue;
  }

  if (OPEN[ch]) {
    stack.push({ char: ch, line, col });
  } else if (CLOSE[ch]) {
    const top = stack.pop();
    if (!top || top.char !== CLOSE[ch]) {
      errors.push(
        `Line ${line}, col ${col}: unmatched '${ch}'` +
          (top ? ` (expected to close '${top.char}' opened at line ${top.line})` : '')
      );
    }
  }
}

if (inString) errors.push(`Unterminated string literal (started with ${inString})`);
if (inBlockComment) errors.push('Unterminated block comment (/* ... */)');
for (const unclosed of stack) {
  errors.push(`Line ${unclosed.line}, col ${unclosed.col}: '${unclosed.char}' is never closed`);
}

// Required structural pieces every valid rules file for this project needs.
const requiredPatterns = [
  { re: /^\s*rules_version\s*=\s*['"]2['"]/m, msg: `missing "rules_version = '2';" declaration` },
  { re: /service\s+cloud\.firestore\s*\{/, msg: 'missing "service cloud.firestore {" block' },
  { re: /match\s+\/databases\/\{database\}\/documents\s*\{/, msg: 'missing the standard "match /databases/{database}/documents {" block' },
  { re: /allow\s+read/, msg: 'no "allow read" rule found anywhere — suspicious for this app (kids\' board needs public read)' },
];
for (const { re, msg } of requiredPatterns) {
  if (!re.test(text)) errors.push(msg);
}

if (errors.length) {
  console.error(`FAIL: ${path.relative(process.cwd(), rulesPath)} failed the lightweight syntax lint:`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`OK: ${path.relative(process.cwd(), rulesPath)} passed the lightweight syntax lint (balanced delimiters, required structure present).`);
