#!/usr/bin/env node
// CI guard: fails (non-zero exit) if firestore.rules has drifted from
// allowlist.json — the single source of truth for parent-admin emails.
// Run locally with `node scripts/check-allowlist-sync.js`, or as part of
// the GitHub Actions workflow on every PR.
//
// This does NOT modify anything. If it fails, run
// `node scripts/sync-allowlist.js` and commit the result.

const { loadParents, loadRulesText, extractRulesParents, arraysEqualAsSets } = require('./allowlist-lib');

function main() {
  let allowlistParents;
  let rulesParents;

  try {
    allowlistParents = loadParents();
  } catch (err) {
    console.error(`FAIL: could not read allowlist.json — ${err.message}`);
    process.exit(1);
  }

  try {
    rulesParents = extractRulesParents(loadRulesText());
  } catch (err) {
    console.error(`FAIL: could not read allowlist block from firestore.rules — ${err.message}`);
    process.exit(1);
  }

  if (!arraysEqualAsSets(allowlistParents, rulesParents)) {
    console.error('FAIL: firestore.rules allowlist has drifted from allowlist.json.');
    console.error(`  allowlist.json  (${allowlistParents.length}): ${allowlistParents.join(', ')}`);
    console.error(`  firestore.rules (${rulesParents.length}): ${rulesParents.join(', ')}`);
    console.error('Run `node scripts/sync-allowlist.js` to regenerate firestore.rules and commit the result.');
    process.exit(1);
  }

  console.log(`OK: firestore.rules matches allowlist.json (${allowlistParents.length} parent(s)).`);
}

main();
