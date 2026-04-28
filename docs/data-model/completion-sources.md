# Completion Source-of-Truth — Canonical Decisions

**Status:** DRAFT — pending Lola sign-off (Apr 28, 2026)
**Trigger:** Dispatch — Completion Source-of-Truth Audit (Apr 28, 2026)
**Owner:** Coder

This doc is the canonical reference for "where does a task-done write go." Read it before adding any completion-write code path. Future PRs that touch any of these tables MUST update this doc.

---

## Problem statement (one paragraph)

Three concurrent task-tracking systems write to different tables and never reconcile. Each surface (parent dashboard, kid portal, Belle page, leaderboards, notifications) reads from a different one, so they disagree. Root cause is a missing canonical write path: every route invents its own INSERT, and there's no fanout helper that guarantees all surfaces stay in sync.

The fix is **(1) one fanout helper that owns all completion writes, (2) one canonical read source per surface, (3) drop dead tables.**

---

## Canonical write target per category

For each category, exactly one row in `kid_daily_checklist` (the parent rollup), plus a row in the domain log if the category has one.

| Category | Canonical kid-facing surface | Domain log table | Notes |
|---|---|---|---|
| Daily checklist (morning routine, breakfast dishes, school room clean, etc.) | `kid_daily_checklist` | none | This row is itself canonical |
| Belle daily care (am_feed, am_walk, pm_feed, pm_walk, brush_fur/brush_teeth on extra-task days) | `kid_daily_checklist` (parent rollup) | `belle_care_log` | Domain log keyed `(kid_name, care_date, task)` |
| Belle weekend grooming (bath, nail_trim, ear_clean) | `kid_daily_checklist` (parent rollup) | `belle_grooming_log` | Same fanout pattern as daily care |
| Other pet care (Spike, Midnight, Hades) | `kid_daily_checklist` (parent rollup) | `pet_care_log` | |
| Zone chores | `kid_daily_checklist` (parent rollup, one row per zone-day) | `zone_task_rotation` (per-sub-task) | See "Zone sub-task model" below |
| Homeschool task | `kid_daily_checklist` (parent rollup) | `homeschool_task_completions` | Already coupled correctly today |
| Daily routine summary (`routine_completions`) | DROP — `kid_daily_checklist` is sufficient | none | Phase B drops this writer |

### Tables that are READ-ONLY for surfaces (no fanout writes)

- `kid_daily_checklist` itself — the canonical kid daily view
- `pet_care_daily_snapshots` — daily aggregate, regenerated; not a write target
- `task_submissions` — proof-of-work / photo submission, separate concept (rewards system); out of scope for this audit

### Tables to drop in Phase F (after live observation)

- `zone_completions` — DEAD. No INSERT site exists in `src/`. Only one SELECT in `src/lib/database.ts:170` (the Zone Status Board read that's been showing 0%).
- `daily_routines` — verify no readers, drop
- `routine_completions` — drop with `routines` route refactor
- `daily_checklist_completion` — verify no readers, drop
- `kid_daily_care` / `kid_daily_care_log` — see open question on health system below

---

## Belle daily denominator (corrects Phase A.1 in the dispatch)

Belle daily task count is variable, not a fixed 5/4 split:

- **Base every day:** `am_feed`, `am_walk`, `pm_feed`, `pm_walk` (4 tasks)
- **Extra task** (per `EXTRA_TASK` in `src/app/api/kids/belle/route.ts`): `brush_fur` Mon/Fri, `brush_teeth` Wed (+1 task on those days)

So the daily denominator is `getDailyTasks(date).length` — 4 most days, 5 on Mon/Wed/Fri.

Weekend grooming is tracked separately in `belle_grooming_log`; that has its own per-weekend denominator (1–4 tasks depending on rotation week).

---

## `am_feed_walk` legacy split (Phase A.1)

`am_feed_walk` is already labeled `(old)` in `TASK_LABELS` (`src/app/api/kids/belle/route.ts:27`). The forward path (`am_feed`, `am_walk`) is already the active path in `getDailyTasks()`.

**Migration plan:** one-shot SQL backfill: `UPDATE belle_care_log SET task = 'am_feed' WHERE task = 'am_feed_walk'` then INSERT a paired `am_walk` row for each. Then drop `am_feed_walk` from `TASK_LABELS`. Volume is tiny (~3 distinct rows in the audit window).

---

## Zone sub-task model (corrects #6 in Lola's reply)

**Decision: NO new `zone_subtask_completions` table.** Existing `zone_task_rotation` already provides per-sub-task granularity:

- `zone_task_library` = task definitions per zone (e.g., 8 sub-tasks under "Hotspot")
- `zone_task_rotation` = one row per (zone_key, task_id, kid_name, assigned_date), with `completed: bool` + `completed_at: timestamp`. Already written by `complete_task` / `uncomplete_task` actions in `src/app/api/kids/zone-tasks/route.ts`.
- `kid_daily_checklist` "Morning Zone Chores: $ZONE" row = parent rollup. Auto-flips ✅ when all `zone_task_rotation` rows for `(kid, zone, date)` are completed. Kid can also manually mark parent done as an override.

### What the Zone Status Board read currently does

`src/lib/database.ts:160-176` does a `LEFT JOIN LATERAL ... FROM zone_completions` to show last completion date. **That's the source of the "0% Hotspot" bug** — `zone_completions` is dead, so it always returns NULL.

**Fix in Phase C:** rewrite the join to read from `zone_task_rotation` aggregating `MAX(completed_at) WHERE completed = TRUE` per `zone_key`, optionally with a count of done/total to show partial-progress.

### Sub-task UI (Lola's preference: Option A)

- Daily checklist: shows just the parent line "Morning Zone Chores: $ZONE", with a `done/total` chip (e.g., "5/8")
- Tap parent line → drill into Chores & Zones board for that zone → check off individual sub-tasks
- When all sub-tasks done → parent flips ✅ automatically; if kid taps parent directly, parent flips ✅ as override (sub-tasks remain in their actual state on the board for accuracy)

---

## Identifier translation (Dispatch 115 stays parked)

We keep schema rename `child_name → kid_name` parked. The fanout helper accepts a single `kid: string` arg and translates per table:

| Table | Column |
|---|---|
| kid_daily_checklist | `child_name` |
| pet_care_log | `child_name` (per Dispatch 115 inventory) |
| belle_care_log | `kid_name` |
| belle_grooming_log | `kid_name` |
| homeschool_task_completions | `kid_name` |
| zone_task_rotation | `kid_name` |
| zone_completions | `completed_by` (dead — won't matter post-Phase F) |

The translation lives in `FANOUT_MAP[category]` so when the rename PR lands later, it's a one-line change per entry.

---

## Helper API

```ts
// src/lib/task-completion.ts
import type { CompletionCategory } from './task-completion-types'

interface LogTaskCompletionOpts {
  kid: string                    // lowercase first name
  category: CompletionCategory   // 'daily' | 'belle_care' | 'belle_grooming' | 'pet_care' | 'zone' | 'homeschool'
  taskKey: string                // e.g., 'am_feed', 'Morning Routine', task_id for zones
  parentEventId?: string         // for zones: the kid_daily_checklist event_id of the parent rollup
  date?: string                  // YYYY-MM-DD, defaults to America/Chicago today
  completedAt?: Date             // defaults to NOW()
  meta?: Record<string, unknown> // category-specific extras (e.g., zone_key, pet_name)
}

export async function logTaskCompletion(opts: LogTaskCompletionOpts): Promise<{
  checklist_row_id: string
  domain_row_id?: string
  category_complete: boolean      // true iff this completion brought the category to fully done
  category_total: number
  category_done: number
}>

export async function unlogTaskCompletion(opts: LogTaskCompletionOpts): Promise<void>
```

Implementation requirements:
- Single transaction (BEGIN/COMMIT) — all or nothing
- Idempotent on re-tap (UPSERT, not duplicate)
- Returns `category_complete` so the caller can fire the right notification with the right denominator (fixes notification bugs #6/#7/#8)
- For zones: when `category_complete=true` for a kid-zone-date, also flips the parent `kid_daily_checklist` rollup row to `completed=true`

`unlogTaskCompletion` symmetrically reverses (sets completed=false, NULLs completed_at, recomputes parent rollup).

---

## Read-side canonical sources

| Surface | Reads from |
|---|---|
| Parent: Kids Daily Tasks list | `kid_daily_checklist` |
| Parent: Chores & Zones board | `zone_task_rotation` (currently reads dead `zone_completions` — fix in Phase C) |
| Kid portal: My Day daily checklist | `kid_daily_checklist` |
| Kid portal: Pet Care card | `kid_daily_checklist` (parent rollup rows) |
| Belle Care page | `belle_care_log` (with task name match — fix `am_feed_walk` legacy in Phase A.1) |
| Spike / Midnight / Hades pages | `pet_care_log` |
| This Week leaderboard | `belle_care_log` count vs. `getDailyTasks(date).length` (NOT count of rows-only) |
| Family Huddle leaderboard | `kid_daily_checklist` (already does — verify task_category filter) |
| Notifications (category-complete) | `kid_daily_checklist` count + `getCategoryDenominator(kid, category, date)` |

---

## Open questions for Lola

1. **`kid_daily_care_log` (health items — meds, vitamins, etc.):** Currently a 4th system, written by `src/app/api/kids/health/route.ts:321`. Not in your dispatch. Should it fanout to `kid_daily_checklist` too (so meds taken shows up in daily complete count), or stay siloed in the health tab? My read: stay siloed for now — meds adherence has its own separate tracking and goes into the Provider PDF; folding it into the daily checklist may create medication-shaped rollup rows that confuse the surface. Decision needed.
2. **`task_submissions` (photo proof for stars):** Separate concept, kid-portal:570 + rewards:934. Confirm out-of-scope for this audit.
3. **`pet_care_log` dual-writer:** Written from both `kids/pet-care/route.ts:34` AND `kids/zone-tasks/route.ts:724` (because Spike/Midnight care also lives in the zone rotation as `pet_spike` / `pet_midnight` zones). Helper needs to dedupe — same task done in two places shouldn't double-count. Plan: pet_care_log gets a unique constraint on `(kid_name, pet_name, task, care_date)`, helper UPSERTs.
4. **Zone manual override semantics:** when kid taps parent rollup row, do we (a) just flip the parent rollup to ✅ leaving sub-tasks in actual state, or (b) also flip all sub-tasks to ✅? My read: (a) — preserves the actual completion record. Confirm.

---

## Migration scope (full list of write sites to refactor in Phase B)

Found via `grep -rn 'INSERT INTO …'` across `src/`:

| File | Line | Table | Action |
|---|---|---|---|
| `src/app/api/kids/dashboard/route.ts` | 243 | kid_daily_checklist | Migrate to helper |
| `src/app/api/kids/checklist/route.ts` | 810, 1075, 1178 | kid_daily_checklist | Migrate (3 paths: complete, substep toggle, skip) |
| `src/app/api/kids/belle/route.ts` | 178, 435 | belle_grooming_log, belle_care_log | Migrate |
| `src/app/api/kids/belle/route.ts` | 464, 474, 612 | UPDATE belle_*_log | Migrate to `unlogTaskCompletion` / use helper for grooming complete |
| `src/app/api/kids/pet-care/route.ts` | 34 | pet_care_log | Migrate |
| `src/app/api/kids/zone-tasks/route.ts` | 547, 599, 611, 627, 724 | zone_task_rotation, pet_care_log | Migrate (complete_task + complete_all + bonus + zone-pet-care) |
| `src/app/api/homeschool/route.ts` | 1386 | homeschool_task_completions | Migrate |
| `src/app/api/routines/route.ts` | 91 | routine_completions | DROP — replaced by kid_daily_checklist writes already happening |

**Out of scope for this audit (left alone):**
- `src/app/api/kid-portal/route.ts:570` (task_submissions)
- `src/app/api/rewards/route.ts:934` (task_submissions)
- `src/app/api/kids/health/route.ts:321,336` (kid_daily_care_log / kid_daily_care) — pending Q1 above

---

## CI guardrail

After Phase B lands, add a pre-commit / CI grep:

```
git grep -nE 'INSERT INTO (kid_daily_checklist|belle_care_log|belle_grooming_log|pet_care_log|zone_task_rotation|homeschool_task_completions)' src
```

…must return zero matches outside `src/lib/task-completion.ts`. Any new completion write goes through the helper.

---

## Phase F readiness

Before dropping any of `zone_completions`, `daily_routines`, `routine_completions`, `daily_checklist_completion`:

- Confirm zero readers in `src/` (`zone_completions` already 1 reader → kill that read in Phase C; the others need a re-grep).
- Wait one full week of live observation post-Phase-B.
- Do this as its own commit/PR for easy revert.
