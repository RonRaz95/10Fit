# 10Fit

A gym companion that runs as an installable web app on your phone, works offline,
and manages progressive overload for you.

No build step, no server, no dependencies to install — three static files plus
icons.

---

## What it does

**Tracks your workouts.** Pick a program, log weight and reps per set, confirm each
set as you finish it. Confirmed sets are saved the moment you tap the check mark,
so closing the app mid-workout can't lose them.

**Tells you what to lift.** Every exercise carries its own sets, rep range and
weight step. The app reads your history and prefills the weight you should be on
today, along with the set and rep target.

**Remembers your best.** Each exercise shows your all-time best set and your last
performance, so you know what you're chasing.

**Keeps a full history.** Browse by workout name, then by date, then open any past
session to fix a mistake — weights, reps, exercise order, or delete it entirely.

**Starts you off quickly.** Four preset splits — Push/Pull/Legs, Upper/Lower, Bro
Split (5 day) and Full Body (3 day) — load straight into your programs, or build
your own from a database of 77 exercises.

**Flags stalls, doesn't decide for you.** Each exercise card shows how many
sessions in a row went by with no progress. What to do about it — push through,
ease off, swap the exercise — is your call.

---

## The progression engine

This is the core of the app: plain deterministic code, unambiguous rules, no
guesswork. It follows Double Progression — the only scheme the app supports.
Hold the weight until every set reaches the top of the rep range, then add weight
and restart at the bottom.

With `2 sets × 6–10 reps, +5 kg`:

| Last session | What the app tells you |
|---|---|
| 50 kg × 8, 7 | Stay at 50, add reps |
| 50 kg × 9, 8 | Stay at 50, add reps |
| 50 kg × 10, 9 | Stay at 50, add reps |
| **50 kg × 10, 10** | **Move up to 55 kg, restart at 6** |
| 55 kg × 7, 6 | Stay at 55, add reps |

### Bodyweight exercises

Pull-ups, dips and push-ups can't be loaded like a barbell, so they're handled
separately. Mark an exercise as **Bodyweight** in the ⚙ editor and the weight
column becomes *added* load — from a belt or vest — where `0` means pure
bodyweight. The built-in bodyweight movements are flagged automatically.

What changes:

- **At the rep ceiling**, if you've set a weight step it tells you to add that to
  a belt. With the step at `0` — no way to add load — it tells you to raise the
  rep range or add a set, rather than inventing a weight.
- **Volume is counted in reps**, since there are no kilos to multiply, and the
  progress chart plots your best set in reps instead of a flat line on zero.

Put weight on a belt and it goes back to charting and progressing by added load.

### Configuring it

Per exercise, via the ⚙ button in the program editor: load type, sets, rep range,
and weight increment. Defaults are 2 sets, 6–10 reps, +2.5 kg — and bodyweight
with no increment for the movements that need it.

### Stall detection

Progress is judged set by set, not by total reps. A session counts as progress
only if the working weight went up, or every matched set at the same weight held
or improved (an added set counts too, as long as nothing existing dropped). So
`50 kg × 10, 10` → `50 kg × 8, 8, 8` is **not** progress, even though the rep
total rose — the first set went backwards.

The exercise card shows a running count: *"3 sessions without progress"*. It
resets to zero the moment a session clears the bar above. Deload sessions (see
below) are skipped when counting, so a deliberately light day never breaks or
inflates the streak. The app doesn't suggest anything from this number — no
deload, no drop set, no swap. It's yours to read.

### If you do more or fewer sets than planned

The engine reads the sets you actually performed, not the number you configured.

**More.** Do a third set on a two-set exercise and that becomes the plan, so all
three then need to reach the ceiling before the weight moves. Reach it on all
three and the weight goes up and the plan returns to two.

**Fewer.** The weight only rises once you've done at least the configured number
of sets. Do two of three, both at the top of the range, and the weight stays put —
so the app says exactly that: *"You did 2 of 3 sets, all at 10. Complete 1 more set
at 10 reps to move up to 55 kg."* It won't tell you to beat a rep count you're
already maxing.

---

## Deload days

A **Deload** checkbox sits on each session header. Check it on a day you're
deliberately training light and the app changes nothing about your numbers — no
percentage math, no prefilled weight. It's purely a flag for reality: this
session shouldn't count toward progression.

**What gets recorded is what you did.** The progression engine and the
sessions-without-progress counter both skip flagged sessions, so a light day
can't reset your working weight or read as a stall. Check it, log whatever you
actually did, and move on — deciding when a light day is warranted is up to you.

---

## Setup

### Hosting

Any static host over HTTPS. Service workers don't run over plain HTTP, so without
HTTPS you get no offline support and no installability.

With GitHub Pages: **Settings → Pages → Source: `main`**.

### Installing on iPhone

Open the site in Safari, then **Share → Add to Home Screen**.

iOS has no automatic install prompt — Safari doesn't fire `beforeinstallprompt`,
so the manual route is the only route. Once added, it opens fullscreen with no
address bar.

> **Updating an installed copy:** just open the app. The HTML is fetched
> network-first, so a deployed change lands on the next launch with a
> connection, and the cached copy is used only when the network is unavailable.
> Never delete and re-add the app to force an update — on iOS that takes your
> saved history with it.

---

## Your data

Everything lives in `localStorage` on the device. Nothing is uploaded.

| Key | Contents |
|---|---|
| `fit_sessions` | Every workout: program, date, exercises, sets, deload flag — the source of truth |
| `fit_programs` | Programs, each exercise with its progression config |
| `fit_program_order` | Display order of programs |
| `fit_ex_db` | Exercise database (77 built in, across 6 muscle groups) |
| `fit_history` | Per-exercise view, derived from `fit_sessions` |

⚠️ **There is no backup and no export.** Clearing site data in your browser, or
switching devices, loses your history. This is the biggest gap in the app today.

Older data is migrated automatically on first load. Because the previous format
stored history per exercise with no notion of a workout, imported sessions are
grouped by date under the name **Imported history** — the weights, reps and dates
survive intact, only the program each belonged to is unknown, since it was never
recorded.

---

## The three files

| File | Role |
|---|---|
| `index.html` | The entire app — markup, styles, and all logic |
| `manifest.json` | App identity: name, icons, colors, `standalone` display |
| `sw.js` | Service worker: offline caching and update handling |

Local assets are cached atomically; third-party assets (Chart.js, Google Fonts)
are cached best-effort, so an unreachable CDN can't stop the worker installing.

---

## Screens

| Screen | Purpose |
|---|---|
| Workout Tracker | Train: targets, PRs, per-set logging, stall counter, deload flag |
| Program Builder | Preset splits, build programs, order exercises, set sets/reps/steps |
| Muscles & Exercises | Manage the exercise database |
| Workout History | Browse and edit past sessions |
| Analytics | Progress over time, per exercise |

---

## Security

The app is a static page with no backend, so there is no server to break into and
nothing of yours on anyone else's machine.

- **Injection.** Exercise names and program names are rendered as HTML, so they
  are escaped for quotes as well as angle brackets. An earlier version escaped
  only the latter, which let a quote in a name close an attribute and inject an
  event handler; that is fixed and tested with the same payloads.

A Content Security Policy backs this up: `connect-src` is limited to the app's own
origin — the app makes no outbound network calls at all — and `img-src` blocks
beacon exfiltration.

Publishing the code changes none of this — there is nothing secret in the
repository or its history, and anyone opening the site gets their own empty
storage. What the app cannot protect against is someone holding your unlocked
phone; that is your device passcode's job.

---

## Known limitations

- **No data export or backup.** Everything lives in this browser's storage.
  Clearing site data, or losing the phone, loses your history. This is the
  biggest gap in the app.
- **No cloud sync.** There was a Firebase screen that never had working
  credentials; it was removed rather than left as dead UI. Nothing syncs
  anywhere.
- **Not tested on a physical iPhone.** Verified in Chromium at iPhone viewport size.
- **The progress chart needs one online visit.** Its library comes from a CDN. Open
  the Analytics screen once with a connection and it is cached for offline use;
  until then that screen says so instead of failing.
- **No automated tests in CI.** Changes are verified in a scripted browser, but
  nothing runs them on a push.

---

## Licence

Personal project. No licence granted.
