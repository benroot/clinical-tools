# pregnancy-calculator — app spec

Estimates and tracks dates for a single pregnancy from one of three possible
starting inputs. See root [`CLAUDE.md`](../CLAUDE.md) for repo-wide structure
and working principles; this file tracks the spec for this app specifically
and should evolve as the app does.

## Core concept

A pregnancy has three interrelated parameters, any one of which establishes
the other two:

- **LMP** — last menstrual period (a date)
- **GA** — gestational age *as of today* (a duration: weeks + days)
- **EDD** — estimated due date (a date), currently computed as LMP + 280 days
  (Naegele's Rule — see [`shared/date-utils.js`](../shared/date-utils.js))

Once any one is known, the other two are derived and all three become fixed
reference points for the rest of the session.

## Mode-based input

A radio group ("What do you know?" — LMP / Due date / Current GA) picks
which of the three parameters is being entered, driving which field(s) are
shown and how they're resolved. This replaced an earlier single freeform
text box that inferred the parameter from the string's format; explicit
mode selection removed the ambiguity that approach had around a past-dated
entry (it could only ever mean LMP under the old heuristic, even though a
past date can, in rare cases, be an EDD for an already-concluded pregnancy —
that's no longer ambiguous, since the user states the mode directly).

| Mode | Field(s) | Resolved as |
|---|---|---|
| LMP | one `MM/DD/YYYY` field | LMP, taken as-is |
| Due date | one `MM/DD/YYYY` field | EDD, backed out 280 days to LMP |
| Current GA | Weeks + Days (two small text fields, numeric) | GA as of today (or "measured on", below), backed out to LMP |

**"Measured on this date" (Current GA mode only).** Blank by default,
meaning the entered GA is as of today. Filling it anchors the GA to a past
date instead — e.g. "8w0d, measured on 6/1/2026" — so a pregnancy can be
established from a GA known at a prior visit. This field is only shown in
Current GA mode (hidden, not merely disabled, in the other two modes),
since it has no meaning there.

**Validity check.** After resolving the LMP (regardless of mode), a future
LMP is always a hard error — that's a logical impossibility regardless of
what the tool is being used for. There's deliberately no upper bound on how
far in the past the LMP can be: this tool is also used to look up dates
within a pregnancy that has already concluded (e.g. "what date was aspirin
started last time?"), where today's GA being past 42 weeks is expected, not
a mistake. Past `PAST_TERM_NOTE_THRESHOLD_DAYS` (42 weeks, in `app.js`),
calculation proceeds as normal and a non-blocking note is shown suggesting
this may be a prior pregnancy — everything below it, including Step 2, still
works off the resolved LMP.

## Iterations

### Iteration 1 — establish and display the three parameters (done)

- Mode-based input; parse as LMP, GA, or EDD per the table above.
- Once a valid value is parsed, compute and display all three: **LMP**, **GA
  (as of today)**, **EDD**.
- Display the date boundaries of each trimester for this specific pregnancy
  (i.e. actual calendar dates, not just week numbers), derived from the LMP.

### Iteration 2 — additional calculations against the fixed EDD (current focus)

Once the three parameters are established (iteration 1), add:

- Given a target gestational age (e.g. `20w0d`), calculate the calendar date
  it falls on for *this* pregnancy.
- Given a target calendar date, calculate the gestational age on that date
  for *this* pregnancy.

### Iteration 3 — prenatal care schedule

- Show expected prenatal care milestones (e.g. anatomy scan at ~20 weeks GA)
  mapped to actual calendar dates for this pregnancy, using iteration 2's
  GA-to-date calculation.
- The reference material for this (visit timing, fetal surveillance timing,
  lab testing) now exists in
  [`prenatal_care_timing_and_labs.md`](prenatal_care_timing_and_labs.md), and
  is rendered as a static reference section at the bottom of `index.html` —
  always visible, not tied to any calculated result. That rendering is
  reference-only for now; this iteration (deriving specific milestones from
  that document and mapping each to a calendar date via iteration 2's
  GA-to-date calculation) is still a separate, not-yet-started task. Do not
  invent or guess clinical milestones/timing not present in that document.
