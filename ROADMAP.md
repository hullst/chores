# Hull Chore Board — Roadmap

Potential value-adds, grouped by theme. Effort is a rough guess (S/M/L).

## Motivation & engagement (highest family payoff)
- **Points & rewards on the kids' board** (M) — turn completion data into
  points, levels, and badges. The admin already tracks streaks but the kids
  never see them; this is the biggest "kids actually use it" lever.
- **Allowance tracking** (M) — points → weekly $, with a parent "mark paid"
  toggle. Natural follow-on to points.
- **Streaks/celebrations visible to kids** (S) — surface the already-computed
  streaks on each kid card, reusing the existing confetti/sound engine.
- **Weekly leaderboard / family goal** (S–M) — e.g. "family hit 90% this week
  → movie night."

## Parent convenience
- **Photo proof** (M) — attach a photo to a chore (Firebase Storage) to confirm
  it was actually done. Adds a storage dependency + cost.
- **Recurring one-offs / scheduling** (M) — e.g. "add 'rake leaves' every
  Saturday in October" without hand-editing templates each time.
- **Reminders / notifications** (M–L) — push e.g. "chores posted" at 8am or
  "Theodore still has 3 left." Needs FCM + service-worker push (SW now exists).
- **Undo for quick-add & resets** (S) — a toast with "undo" after destructive
  or quick actions.

## Reliability & polish
- **Roster editing in admin** (M) — add/remove kids, ages, avatars without
  code; needs careful kid-ID migration (history/avatars/assignments reference
  IDs).
- **Migrate checkmark on reassignment** (S) — when a chore moves between kids,
  carry its completion state instead of orphaning it.
- **Real PNG app icon** (S) — current icon is SVG; 192/512 PNGs give a crisp
  iOS home-screen install.
- **History view per kid** (S–M) — calendar heatmap of completion (data is
  already in Firestore).

## Platform / cost
- **Cloudflare Pages migration** (S) — the original goal; drop-in for these
  static files, Firestore keeps working as-is.
- **Tighten security further** (M) — parent auth is in place; could add App
  Check to block drive-by bots, or per-field validation in the Firestore rules.

## Suggested next 2–3
1. **Points + visible streaks** — biggest behavioral payoff, builds on what's
   already there.
2. **Roster editing** — removes the last reason to ever touch the code.
3. **Cloudflare migration** — closes out the initial ask.
