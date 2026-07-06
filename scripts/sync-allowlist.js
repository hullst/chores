#!/usr/bin/env node
// Regenerates the parent-allowlist block in firestore.rules from
// allowlist.json (the single source of truth). Run this after editing
// allowlist.json, then redeploy the rules.
//
// Usage: node scripts/sync-allowlist.js

const fs = require('fs');
const {
  loadParents,
  loadRulesText,
  regenerateRulesText,
  RULES_PATH,
} = require('./allowlist-lib');

function main() {
  const parents = loadParents();
  const rulesText = loadRulesText();
  const updated = regenerateRulesText(rulesText, parents);

  if (updated === rulesText) {
    console.log('firestore.rules already matches allowlist.json — nothing to do.');
    return;
  }

  fs.writeFileSync(RULES_PATH, updated, 'utf8');
  console.log(`Updated firestore.rules with ${parents.length} parent(s) from allowlist.json.`);
  console.log('Remember to redeploy the rules (Firebase console or `firebase deploy --only firestore:rules`).');
}

main();
