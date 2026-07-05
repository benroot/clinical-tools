# dose-counter — app spec

Helps a prescriber figure out how many pills to put on a prescription when
some doses of a course have already been given in the hospital and the rest
must be dispensed for the patient to take at home. See root
[`CLAUDE.md`](../CLAUDE.md) for repo-wide structure and working principles;
this file tracks the spec for this app specifically and should evolve as the
app does.

## Core concept

A course of medication is defined by:

- **Total days** — length of the course, in days
- **Frequency** — doses per day: `qd` (1x), `bid` (2x), `tid` (3x), `qid` (4x)

These two together fix the **total doses** for the full course. Some of
those doses have already been administered (typically in the hospital);
subtracting those gives the **doses remaining** — the number that must
actually be prescribed.

Later, instead of asking the user to state how many doses have already been
given, the app should derive that count automatically from the timing of the
first dose and the current date/time, per iteration 3 below.

## Iterations

### Iteration 1 — total doses from days + frequency (current focus)

- Text entry for number of days (a plain number).
- Frequency selector: `qd`, `bid`, `tid`, `qid`.
- Compute and display total doses needed for the full course (days ×
  doses-per-day).

### Iteration 2 — subtract doses already given (superseded by iteration 3)

Once total doses are established (iteration 1), add:

- Numeric entry for doses already given (e.g. in the hospital).
- Compute and display doses remaining to prescribe (total − given).

This manual entry was later removed once iteration 3 could derive the same
"doses given" count from dosing dates/times instead of a typed number — see
3c below.

### Iteration 3 — derive doses given from dose timing

Replaces iteration 2's typed "doses given" count — instead of typing a
number directly, derive it from when dosing started. Built in sequential
sub-steps; each is confirmed working before starting the next.

- **3a — date of first dispense.** Capture the calendar date the first dose
  was given. (Done: `firstDoseDateInput` field, parsed/validated against
  today.)
- **3b — how many doses given that day.** For frequencies with more than one
  dose per day (`bid`/`tid`/`qid`), capture how many doses were given on the
  day of the first dispense (e.g. 2 of 3 for `tid`, if dosing started
  partway through the day). For `qd` this is always 1, so no input needed.
  (Done: `firstDayDoseCount` selector, hidden for `qd`.)
- **3c — doses given today, and doses remaining.** No time-of-day guessing —
  the current date is read directly (`new Date()`), and the user picks how
  many doses have been given *today* from a dropdown (0 up to doses-per-day
  for the selected frequency; skipped, same as 3b, when today *is* the first
  dispense date, since 3b already covers that day). Total doses given =
  day-1 count (3b, or 1 for `qd`) + full doses-per-day for every intervening
  calendar day between the first dispense date and today (exclusive of both
  ends) + today's dropdown count. Doses remaining = total doses (iteration
  1) − doses given. (Done: `todayDoseCount` selector, `computeSchedule()`.)
- **3d — final dose date.** Using the same day-1 count and doses-per-day,
  project forward from the first dispense date — day 1 partial, every day
  after at a full doses-per-day — to find the calendar date cumulative
  doses reach the course total, and how many doses fall on that last day
  (which may be less than a full doses-per-day if day 1 was short). This is
  independent of "today" — it only depends on the first-dispense info and
  the course total, so it can display as soon as those are set. (Done:
  `finalDoseSummary`, computed alongside 3c in `computeSchedule()`.)
- **3e — full dose-schedule table.** A day-by-day table view of the same
  schedule as 3c/3d: one row per calendar date from the first dispense
  through the final dose, one column per dose slot for the current
  frequency. Each cell is given / remaining / not applicable (a slot past
  the final day's shorter requirement, or — on day 1 specifically — a slot
  before dosing began). On day 1, a partial count fills from the *last*
  slot backwards (dosing started partway through the day, so the earliest
  slot(s) were skipped, not the latest); every other day fills from the
  first slot forward as the day progresses. Renders the full date range, no
  truncation. (Done: `scheduleRows` getter, sharing `getScheduleDetails()`
  with `computeSchedule()`.)
