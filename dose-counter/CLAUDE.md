# dose-counter — app spec

Helps a prescriber figure out how many pills to put on a prescription when
some doses of a course have already been given in the hospital and the rest
must be dispensed for the patient to take at home. See root
[`CLAUDE.md`](../CLAUDE.md) for repo-wide structure and working principles;
this file tracks the spec for this app specifically and should evolve as the
app does.

## Core concept

A course of medication is defined by:

- **Total days** — length of the course, in days.
- **Frequency** — doses per day: `qd` (1x), `bid` (2x), `tid` (3x), `qid`
  (4x).

These fix the **total doses** for the full course. Rather than asking the
prescriber to type how many doses have already been given, that count is
derived from the dosing schedule itself — when the first dose was given,
how many doses have happened since, and how many are left.

## How it works

- **Total doses** = days × doses-per-day for the selected frequency.
- **Day 1** is anchored by the first-dispense date. For `bid`/`tid`/`qid`,
  the prescriber also picks how many doses were given on that first day
  (dosing may start partway through a day); for `qd` it's always 1, no
  input needed.
- **Every full day** between day 1 and today counts as a full day's doses.
  **Today** gets its own "how many given today" dropdown — skipped when
  today *is* day 1, since day 1's count already covers it.
- **Doses remaining** = total doses − doses given so far, recomputed live
  as any input changes. An error shows if the schedule implies more doses
  given than the total course (`getScheduleDetails()` / `computeSchedule()`
  in `app.js`).
- **Final dose** — projecting forward from day 1 (day 1 partial, every day
  after a full doses-per-day) finds the calendar date cumulative doses
  reach the course total, and how many fall on that last day (which can be
  short if day 1 was short).
- **Schedule table** (`scheduleRows`) shows this same math day-by-day: one
  row per calendar date (full range, no truncation), one column per dose
  slot, each cell given / remaining / not-applicable. Day 1 fills from the
  *last* slot backward (earlier slots were skipped before dosing began);
  every other day fills from the first slot forward as the day progresses.
- Date fields accept `MM/DD/YYYY`, an offset like `t-5`/`w`/`m`/`y`, or the
  literal `today` — all via the shared `resolveDateField` (see
  [`shared/date-utils.js`](../shared/date-utils.js)), same as every other
  app in this repo.