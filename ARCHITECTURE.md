# Architecture — Hull Family Chore Board

A static, client-side PWA talking directly to Cloud Firestore. There is no server-side
code of our own: the browser holds the app logic, Firestore holds the data, and
`firestore.rules` is the only authorization layer.

```
Browser (index.html / admin.html)
   │  loads chore-engine.js  (roster + recurring-chore generation)
   │  registers sw.js        (offline app shell)
   │
   ├── Firebase Web SDK ──► Cloud Firestore  (day docs, templates, avatars)
   │                              ▲
   │                              └── firestore.rules  (authz: parent vs. kid)
   └── Google Sign-In (admin only) ─► identity used by the rules
```

## Data model (Firestore)

All documents live under the `chores` collection:

- **Day docs** — key is `<dayType>_<date>` (e.g. `weekday_2026-7-1`,
  `saturday_...`, `sunday_...`). Built by `chore-engine.js`. Hold per-kid completion
  `state` plus any admin overrides (reassignments, "away", per-day add/rename/remove).
  A day doc is created lazily on the first tick or first admin edit.
- **`templates`** — the recurring-chore defaults when a parent edits them in the admin.
  When present it overrides the built-in `DEFAULT_TEMPLATES`; every board live-updates.
- **`avatars`** — kid → chosen avatar. Open to everyone (kids pick their own).

The `chore-engine.js` module is the single source of truth for the **roster** (`KIDS`)
and for **generating** each kid's chores for a given day type + date. Rules come in
three shapes — `fixed`, `rotateOne`, `rotateEach` — interpreted at runtime, with an
optional `dow` day-of-week filter and a rotation index anchored at `ROTATION_EPOCH`
(2025-03-01). The board and admin both load it so they can never disagree.

## Security model (`firestore.rules`)

The design goal: **kids need no login; parents unlock management.**

- **Reads:** open to everyone (the board must render on a tablet with no account).
- **Kid writes:** allowed but narrow —
  - creating a day doc is allowed only if it contains *only* `state` + `updatedAt`
    (a first tick), and
  - updates are allowed only when the diff touches *only* `state` + `updatedAt`
    (`choreTickOnly()`), so a kid can tick chores and nothing else.
  - `chores/avatars` is fully open (avatar picking is a kid action).
- **Parent writes:** reassignments, editing recurring defaults, and deletes
  ("reset day") require `isParent()` — a verified Google email in the hardcoded
  allowlist. Deletes are parent-only.
- Everything outside `chores/**` is denied.

**Drift hazard:** the parent email list exists in two places —
`isParent()` in `firestore.rules` and `ALLOWED_PARENTS` in `admin.html`. Both must
match; there is no automation enforcing it. Keeping them in sync is a manual step
(and a candidate for the roadmap "sync allowed emails from one config source" idea).

The Firebase web config / API key is public by design — security is enforced entirely
by the rules, not by hiding the key. See `CHANGELOG.md` for the one-time Firebase /
Google Cloud console setup (Google sign-in, authorized domains, API-key website + API
restrictions) that the sign-in flow depends on.

## Offline strategy (`sw.js`)

- **App shell** (our same-origin HTML/JS/manifest/icon): **network-first**, falling
  back to cache when offline — so deploys go live immediately when online, and the
  board still opens with no connection.
- **Known static CDNs** (Firebase SDK, SortableJS, fonts): **cache-first**.
- **Firestore API / streaming and everything else:** left completely untouched, so
  realtime sync is never intercepted by the service worker.

Firestore **offline persistence was deliberately removed** — on some mobile browsers
its init stalled the first read and left the board blank. The board now renders
immediately at boot (and on snapshot error), and updates when the live snapshot
arrives. Bumping `CACHE` in `sw.js` flushes stale assets to clients.

## Hosting choice

Served from **GitHub Pages** (`main` branch) rather than Firebase Hosting: the app is
just static files, the repo already lives on GitHub, and a `git push` publishes with
no extra tooling. Firestore is used purely as the backend regardless of where the
static files are hosted — a Cloudflare Pages migration (a roadmap item) would be a
drop-in for these files with the backend unchanged. There is no CI/CD; publishing is a
manual push.
