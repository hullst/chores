# Hull Family Chore Board

An installable, offline-capable PWA that shows the Hull kids their daily chores and
lets parents manage them. It's a static client-side app backed by Cloud Firestore —
no local server to run.

- **Live:** https://hullst.github.io/chores/ (kids' board)
- **Admin:** the same site; a parent signs in with Google to unlock management.

## What it does

- **Kids' board** (`index.html`) — the day's chores per child, grouped morning /
  afternoon / evening. Kids tick chores off (no login), with confetti/sound on
  completion, and can pick their own avatar.
- **Per-kid kiosk** — `index.html?kid=alice` focuses the board on one child for
  handing over a tablet; the 🏠 button returns to all kids.
- **Auto day-rollover** — always-on displays advance to the new day automatically.
- **Parent admin** (`admin.html`) — after Google sign-in:
  - **Manage Assignments** — drag-and-drop reassign a day's chores, "mark away"
    (splits a child's chores among whoever's home), add / rename / remove per day.
  - **Edit Recurring Defaults** — add / edit / delete the recurring chores per day
    type (Weekday / Saturday / Sunday), including rotations and day-of-week filters.
    Saved to a Firestore `templates` doc; every board live-updates, no code change.
  - **Quick Add** — type or speak (e.g. "Theodore take out trash") to add a chore
    to today; parses the child(ren), time of day, and picks a fitting icon.
  - **Stats** — completion counts, streaks.

Recurring chores are **data, not code** — see `chore-engine.js` (`DEFAULT_TEMPLATES`).
The engine is verified to produce identical output to the old hand-coded builders.

## Install (PWA)

Open https://hullst.github.io/chores/ in a browser and add it to the home screen:

- **iOS Safari:** Share → *Add to Home Screen*.
- **Android Chrome:** menu → *Install app* / *Add to Home Screen*.
- **Desktop Chrome/Edge:** the install icon in the address bar.

Once installed it runs full-screen and works through brief wifi drops (the app shell
is cached by the service worker; live chore data still needs a connection to sync).

## Roster & parent accounts

Both the child roster and the parent allowlist are **hardcoded** today (roster editing
in the admin is a roadmap item):

- **Kids** — `KIDS` in `chore-engine.js`.
- **Parents who may manage** — single source of truth is `allowlist.json`.
  `admin.html` fetches it at runtime; `firestore.rules` carries its own copy
  (Firestore rules have no network access, so it can't fetch the JSON at
  eval time). To add/remove a parent:
  1. edit `allowlist.json`
  2. run `node scripts/sync-allowlist.js` to regenerate the marked block in
     `firestore.rules`
  3. re-publish the rules in the Firebase console (or `firebase deploy
     --only firestore:rules`)

  `node scripts/check-allowlist-sync.js` (also run in CI on every PR, see
  `.github/workflows/firestore-rules-ci.yml`) fails if the two ever drift —
  previously a silent failure mode where a parent could sign in but every
  write got rejected by the rules (or vice versa). Currently:
  `hullst89@gmail.com`, `kerilynhull@gmail.com`.

## Deploy

Static files are served from **GitHub Pages** on `main` at
https://hullst.github.io/chores/. Publishing is a plain `git push` to `main` — there
is no CI/Actions workflow. When you ship changed assets, bump the `CACHE` version in
`sw.js` so clients pick them up.

The Firestore backend and its security rules are managed in the Firebase console; see
`ARCHITECTURE.md` for the security model and `CHANGELOG.md` for the one-time Firebase /
Google Cloud setup (auth, authorized domains, API-key restrictions).

## Files

| File | Purpose |
|------|---------|
| `index.html` | Kids' chore board + kiosk view |
| `admin.html` | Parent admin (Google sign-in gated) |
| `chore-engine.js` | Roster + recurring-chore generation (shared) |
| `firestore.rules` | Backend access control |
| `sw.js` | Service worker (offline app shell) |
| `manifest.json`, `icon.svg` | PWA install metadata + icon |

## Notes for maintainers

This local checkout was cloned into the fleet on **2026-07-01**; before that the
project lived only on GitHub. This copy and the `hullst/chores` repo are the same
project — treat GitHub `main` as the deploy source of truth.

See `ARCHITECTURE.md`, `ROADMAP.md`, and `CHANGELOG.md` for more.
