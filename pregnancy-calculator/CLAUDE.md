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

## Single-box input parsing

One text box accepts any of the three parameters and infers which one was
entered from its format:

| Format | Example | Interpreted as |
|---|---|---|
| `XwYd`, or just `Xw` (days default to 0) | `18w3d`, `12w` | GA as of today |
| `MM/DD/YYYY`, date is today or in the past | `03/10/2026` | LMP |
| `MM/DD/YYYY`, date is in the future | `12/01/2026` | EDD |

**Open/future enhancement:** a date-only entry that is in the past is always
treated as LMP under this rule, even though a past date could, in rare cases,
represent an EDD for a pregnancy that has already fully concluded (e.g.
back-calculating historical dates for a birth that already happened). This
edge case is intentionally out of scope for now — the past/future heuristic
above is the accepted rule — but a later iteration could add an explicit way
to force "treat this past date as EDD" if a real need for it shows up.

## Iterations

### Iteration 1 — establish and display the three parameters (done)

- Single input box; parse as LMP, GA, or EDD per the table above.
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
- **Blocked**: the reference list of care milestones (what they are and at
  what GA they typically occur) has not been provided yet. Do not invent or
  guess clinical milestones/timing — wait for that material before
  implementing this iteration.
