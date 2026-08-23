# 10Fit

A gym companion that runs as an installable web app on your phone, works offline,
and manages progressive overload for you.

No build step, no server, no dependencies to install — three static files.

---

## What it does

**Tracks your workouts.** Pick a program, log weight and reps per set, confirm each
set as you finish it. Confirmed sets are saved the moment you tap the check mark,
so closing the app mid-workout can't lose them.

**Tells you what to lift.** Every exercise carries its own progression scheme. The
app reads your history and prefills the weight you should be on today, along with
the set and rep target.

**Remembers your best.** Each exercise shows your all-time best set and your last
performance, so you know what you're chasing.

**Keeps a full history.** Browse by workout name, then by date, then open any past
session to fix a mistake — weights, reps, exercise order, or delete it entirely.

**Adds an AI coach on top.** Optional. It advises on the judgement calls the rules
can't make: when a stall needs an extra set, when to finish with a drop set, when
an exercise has stopped working, and when to take a lighter week.

---

## The progression engine

This is the core of the app, and it is plain deterministic code — not the AI. The
rules are unambiguous, and language models are unreliable at arithmetic.

### Double Progression

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

### Triple Progression

Same, but sets come before weight: when every set hits the ceiling, add a set
first. Only once you're at the maximum set count *and* the ceiling does the weight
go up — and then the set count resets.

With `2–3 sets × 6–10 reps, +5 kg`:

| Last session | What the app tells you |
|---|---|
| 50 kg × 10, 10 | Add a third set |
| 50 kg × 10, 10, 8 | Stay at 50, add reps |
| **50 kg × 10, 10, 10** | **Move up to 55 kg, back to 2 sets** |

### Bodyweight exercises

Pull-ups, dips and push-ups can't be loaded like a barbell, so they're handled
separately. Mark an exercise as **Bodyweight** in the ⚙ editor and the weight
column becomes *added* load — from a belt or vest — where `0` means pure
bodyweight. The built-in bodyweight movements are flagged automatically.

What changes:

- **At the rep ceiling**, if you've set a weight step it tells you to add that to
  a belt. With the step at `0` — no way to add load — it tells you to raise the
  rep range or add a set, rather than inventing a weight.
- **A deload cuts reps, not weight.** Taking 85% of "0 kg" is still zero, so a
  bodyweight deload drops the rep target instead.
- **Volume is counted in reps**, since there are no kilos to multiply, and the
  progress chart plots your best set in reps instead of a flat line on zero.

Put weight on a belt and it goes back to charting and progressing by added load.

### Configuring it

Per exercise, via the ⚙ button in the program editor: scheme, load type, starting
sets, max sets, rep range, and weight increment. Defaults are Double, 2 sets, 6–10
reps, +2.5 kg — and bodyweight with no increment for the movements that need it.

### Stall detection

Three consecutive sessions at the same working weight with no improvement in total
reps flags the exercise as **Plateau**. That's the signal the AI coach uses to
suggest adding a set, a drop set, or a different exercise.

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

## Deload and rest weeks

When the coach recommends a lighter week, you get a banner with two buttons —
**This week** or **Next week**. Weeks run Sunday to Saturday.

A deload week changes the numbers: the target and the prefilled weight become a
percentage of your working weight (85% by default, adjustable, rounded to your
configured increment). A rest week changes nothing — it's a reminder, since a week
off has nothing to log.

**The week sets the default; the day decides.** Inside a deload week each workout
has a Deload / Full workout toggle. Feeling strong? Flip to full and your real
working weights come back, without cancelling the week.

**What gets recorded is what you did.** A session is flagged as a deload only if
you actually trained light. This matters: the progression engine and stall
detection skip flagged sessions, so a light week can't reset your working weights
or read as a plateau. If the flag tracked the plan instead of reality, a full
workout during a deload week would silently erase progress.

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

### Connecting the AI coach (optional)

1. Get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. **AI Coach → paste the key → Test Connection**

Test Connection validates the key *and* fetches the list of models your key can
use, then picks a `flash` model. Model IDs are deliberately not hardcoded — Google
ships new ones often, and a hardcoded name would go stale.

The browser calls Google directly; there's no proxy in between. A **Custom
endpoint** option is available if you'd rather run your own backend, in which case
it receives `POST {prompt, historyData}` with the key as a bearer token.

---

## Your data

Everything lives in `localStorage` on the device. Nothing is uploaded, and the AI
key is sent only to the provider you configure.

| Key | Contents |
|---|---|
| `fit_sessions` | Every workout: program, date, exercises, sets — the source of truth |
| `fit_programs` | Programs, each exercise with its progression config |
| `fit_program_order` | Display order of programs |
| `fit_ex_db` | Exercise database (77 built in, across 6 muscle groups) |
| `fit_coach_tips` | Last AI advice, cached per program |
| `fit_deload_week` / `fit_deload_pct` | Active light week and its percentage |
| `fit_history` | Per-exercise view, derived from `fit_sessions` |
| `ai_*` | Provider, key, model, endpoint |

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
| Workout Tracker | Train: targets, PRs, per-set logging, coach tips |
| Program Builder | Build programs, order exercises, set progression schemes |
| Muscles & Exercises | Manage the exercise database |
| Workout History | Browse and edit past sessions |
| AI Coach | Provider settings and a full-plan analysis |
| Analytics | Progress over time, per exercise |

---

## Security

The app is a static page with no backend, so there is no server to break into and
nothing of yours on anyone else's machine. Two things were checked directly:

- **Your API key stays yours.** It is written only to `localStorage`, sent only to
  the provider you configured, and passed as a request header rather than in a URL
  — URLs leak into logs and history. It is not in cookies, and not in the offline
  cache.
- **Injection.** Exercise names, program names and AI replies are all rendered as
  HTML, so they are escaped for quotes as well as angle brackets. An earlier
  version escaped only the latter, which let a quote in a name close an attribute
  and inject an event handler; that is fixed and tested with the same payloads.

A Content Security Policy backs this up: `connect-src` limits outbound requests to
Google, so even a future scripting bug could not post your key elsewhere, and
`img-src` blocks beacon exfiltration.

Publishing the code changes none of this — there are no keys in the repository or
its history, and anyone opening the site gets their own empty storage. What the
app cannot protect against is someone holding your unlocked phone; that is your
device passcode's job.

> Adding a custom AI endpoint on another domain means adding that domain to
> `connect-src` in the CSP.

---

## Known limitations

- **No data export or backup.** Everything lives in this browser's storage.
  Clearing site data, or losing the phone, loses your history. This is the
  biggest gap in the app.
- **No cloud sync.** There was a Firebase screen that never had working
  credentials; it was removed rather than left as dead UI. Nothing syncs
  anywhere.
- **The AI path has not been exercised against the live Google API.** Request
  shape, response parsing and stall detection are verified against recorded
  Google-format responses; real-world answer quality is unverified.
- **Not tested on a physical iPhone.** Verified in Chromium at iPhone viewport size.
- **The progress chart needs one online visit.** Its library comes from a CDN. Open
  the Analytics screen once with a connection and it is cached for offline use;
  until then that screen says so instead of failing.
- **No automated tests in CI.** Changes are verified in a scripted browser, but
  nothing runs them on a push.

---

## Licence

Personal project. No licence granted.
