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

**No hard bounds on the LMP.** This tool supports three timelines, not just
a currently-ongoing pregnancy, so the LMP is never rejected purely for being
far in the past or in the future — the resolved LMP, EDD, trimesters, and
Step 2 all keep working the same way regardless:

- **Normal** — LMP in the past, today's GA within 0–42 weeks. No note shown.
- **Prior/concluded pregnancy** — LMP far enough in the past that today's GA
  exceeds `PAST_TERM_NOTE_THRESHOLD_DAYS` (42 weeks, in `app.js`), e.g.
  looking up when a medication was started last pregnancy. A note suggests
  this may be a past pregnancy; "Gestational age (today)" is still shown
  (however large) since it's a real elapsed duration.
- **Planning ahead** — LMP in the future (a planned/expected next period),
  used to project an EDD before conception has happened. A note explains
  this, and "Gestational age (today)" reads "Not yet — starts in `Xw Yd`"
  instead of a duration, since gestational age isn't defined before the LMP.

Both notes populate the same `timelineNote` field (mutually exclusive, so
one field is enough); malformed dates and the GA-mode "measured on" date
being in the future are still hard errors — those are input problems, not
a timeline this tool intentionally supports.

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
