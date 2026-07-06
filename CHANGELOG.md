# Changelog

## 2026-07-06

Closed out the two "Deferred — needs Stephen" roadmap items: CI validation for
`firestore.rules` and a single source of truth for the parent allowlist.

### Added
- **allowlist.json** — single source of truth for parent-admin emails,
  replacing the old two-place hand-sync (`ALLOWED_PARENTS` in `admin.html`
  and the `isParent()` list in `firestore.rules`). `admin.html` fetches it at
  runtime.
- **scripts/sync-allowlist.js** — regenerates the marker-delimited allowlist
  block in `firestore.rules` from `allowlist.json` (Firestore rules can't
  fetch external config at eval time, so the rules file still carries its
  own copy).
- **scripts/check-allowlist-sync.js** — fails non-zero if `firestore.rules`
  has drifted from `allowlist.json`; run in CI on every PR.
- **scripts/lint-firestore-rules.js** — lightweight, auth-free syntax/
  structure lint for `firestore.rules` (balanced delimiters, required
  structural pieces present). No emulator, no `firebase login` — see the
  script's header comment for why a full rules-engine check was ruled out.
- **.github/workflows/firestore-rules-ci.yml** — runs the lint and the
  allowlist sync-check on every PR and push touching `firestore.rules`,
  `allowlist.json`, `admin.html`, or `scripts/**`.

### Changed
- **README.md** — parent-allowlist section rewritten to document the new
  single-source workflow (edit `allowlist.json` → `node
  scripts/sync-allowlist.js` → redeploy rules) instead of the old two-place
  manual sync.
- **firestore.rules** — the `isParent()` email list is now a
  `ALLOWLIST:START`/`ALLOWLIST:END` marker block generated from
  `allowlist.json`; do not hand-edit it.

## 2026-05-23

Moved the chore board from hand-edited HTML to a data-driven app with a real
admin, parent login, and an installable/offline experience.

### Added
- **chore-engine.js** — shared, data-driven chore generation loaded by the
  board and admin. The recurring chores are now data, not hand-coded logic.
  Verified to produce identical output to the old builders across 7,200
  kid × day-type × date combinations.
- **Admin → Manage Assignments** — drag-and-drop reassignment of a day's
  chores; "mark away" splits a child's chores among whoever's home; add /
  rename / remove per day. Overrides save to that day's Firestore doc; the
  board reads them when present and otherwise auto-generates.
- **Admin → Edit Recurring Defaults** — add / edit / delete the recurring
  chores per day type (Weekday / Saturday / Sunday), including rotations and
  "only on certain weekdays" filters. Saved to a `templates` doc; every board
  live-updates with no code change.
- **Admin → Quick Add** — type or speak (e.g. "Theodore take out trash") to
  add a chore to today. Parses the child (or several, or "everyone"), the time
  of day, and a fitting icon. Voice uses the Web Speech API with fallback.
- **Per-kid kiosk view** — `index.html?kid=alice` focuses the board on one
  child for handing over a tablet; nav switches kids, 🏠 returns to all.
- **PWA / offline** — installable to the home screen (manifest + icon), a
  service worker (network-first app shell, untouched Firestore), and Firestore
  offline persistence so the board survives brief wifi drops.
- **Parent Google sign-in** for the admin, gated to an email allowlist,
  replacing the old client-side PIN.
- **firestore.rules** — anyone can read and tick chores and pick avatars
  (kids' board, no login); only the two parent accounts can reassign chores,
  edit the recurring defaults, or delete days.
- **ROADMAP.md** — prioritized list of potential future value-adds.

### Changed
- Auto day-rollover: always-on displays advance to the new day automatically
  instead of getting stuck on yesterday's board.
- Admin stats now correctly count weekday documents (previously every non-
  Saturday doc was mislabeled as Sunday and its date failed to parse).
- Mobile-friendly admin: columns stack instead of side-scrolling, larger touch
  targets, full-width tabs, single-column stats.

### Removed
- **theo.html** — its generator had drifted out of sync and was buggy on
  weekdays; replaced by the generic per-kid kiosk view.

### Fixed
- **Blank board on mobile / admin chores not loading.** Firestore offline
  persistence could stall the first read on some mobile browsers, and the
  board only rendered inside the snapshot success callback — so if that read
  hung, the page was blank below the header. Removed offline persistence,
  render the board immediately at boot (and on snapshot error), and bumped the
  service-worker cache to flush stale assets. Desktop was unaffected because
  its persistence init succeeded.

### Firebase / Google Cloud setup (one-time — recorded so we don't rediscover it)
- **Authentication → Sign-in method → Google**: Enabled, with a project
  support email selected.
- **Authentication → Settings → Authorized domains**: includes
  `hullst.github.io`.
- **API key** (Browser key, `AIza…Z7k`) **→ Application restrictions →
  Websites** must include ALL of:
  - `hullst.github.io/*`
  - `hull-chores.firebaseapp.com/*`
  - `hull-chores.web.app/*`

  The sign-in popup runs on the `firebaseapp.com` domain and calls the API
  with that referer — omitting it breaks sign-in with "The requested action
  is invalid."
- **API key → API restrictions** must include: Cloud Firestore API,
  Identity Toolkit API, Token Service API.
- **Firestore → Rules**: paste `firestore.rules` and Publish to enforce the
  parent-only writes. To change which parents have access, edit the email list
  in BOTH `firestore.rules` and `ALLOWED_PARENTS` in `admin.html`.

### Hosting
- Served from GitHub Pages on `main` at https://hullst.github.io/chores/.
