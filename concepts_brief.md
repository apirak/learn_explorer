# Learn Explorer: Interest Profiler Rebuild with Tracking and Admin

* **Author:** Apirak Panatkool
* **Date:** 2026-11-06
* **Status:** Brainstorm complete (Goldfish review done, all decisions resolved in rounds 2–3)

## Overview

Learn Explorer helps Thai high-school students find careers that match their interests. A student answers a Thai version of the O*NET Interest Profiler (RIASEC). The app then shows their interest code, matching occupations, and the TCAS university fields that lead to them.

A working prototype exists in `../learn_explorer_prototype/src/interest_profiler`. It is written in plain JavaScript and stores nothing. This project rebuilds it in this repo, on AdonisJS 7, Inertia React, and PostgreSQL. The rebuild adds three things:

1. **Student tracking.** The app records each visit, the step reached, every answer and how long it took, RIASEC scores, which careers the student opened, and downloads.
2. **Admin accounts.** Accounts use three roles: Owner, Admin, and member.
3. **An admin dashboard.** It shows live traffic and funnel counts.

The code should be maintainable. It needs a small design system based on the prototype's "Sticker Lab" theme, and automated tests.

**Target users:** Thai high-school students on phones, most of them under 20, arriving from a link sent by another OnDemand system. Secondary users are OnDemand staff (admins).

**Success measure:** the number of students who open Result, and the number who Download.

## Decisions Made in Clarification

These answers came from the author and set the scope for this brief.

| Topic | Decision |
|---|---|
| Consent | The upstream system that sends the link already collected consent. The MyPath contact form has its own marketing-consent checkbox. Sales will contact students who agree. Download works even without consent. |
| Retention | Data is kept 60 days, then deleted by someone running a command (`students:purge --days=60`). |
| `code` | The upstream system issues `?code=`. It identifies the campaign, and upstream can map it to a real student. We do not control its format. Upstream knows `#` cannot be used. |
| Identity | Students have no account. Losing progress on a new device or after clearing cookies is accepted. |
| Repeat visits | Every visit to Home creates a new record with the same code, so repeat visits are countable. If the browser already has a result, ask "view old result or redo" before the test. If the browser has an unfinished record, ask "continue or restart". |
| Flow | Home → Test → Result → Career → MyPath. MyPath is the study-plan download. Real study plans come later. This round downloads the results PDF as a placeholder. |
| Home | The student types the career they think they want, then presses Start. This goes to the 30-item test. The 60-item link is removed from Home. |
| 30 → 60 | **Deferred (round 2, YAGNI).** v1 has the 30-item test only. When it returns: the student answers only the 30 new items, and the scores are stored separately. |
| Per-question time | **Deferred (round 2, YAGNI).** v1 stores only the current answer for resume and scoring. No per-item timing or median. |
| Scores | R, I, A, S, E, C are stored as separate columns. All answers are also stored. |
| Step funnel | The funnel counts how many records are at each step now, with no time window. A record's step is the furthest step it reached, and it never moves backward. |
| Dashboard chart | **Deferred (round 2, YAGNI).** v1 dashboard shows funnel counts plus Result and Download counts, refreshed by Inertia polling. The 36-bar chart (5-minute buckets over 180 minutes) comes later. |
| Owner | The first person to sign up becomes Owner (confirmed round 2). The author accepts both the outsider-signs-up-first risk and the two-signups-at-once window. No raw-SQL index. |
| Load | About 400 students at once. PostgreSQL. Timezone Asia/Bangkok. |

## Analysis

Six reviewers looked at the concept, each from a different angle (architecture, codebase facts, scope, a first-time reader, implementation readiness, structure). They agree on one point: **load is not the risk.** 400 students produce about 80 writes per second at peak. 60 days of data stays under 1 GB. This is an estimate, not a measurement. One PostgreSQL instance handles that, so this round needs no Redis, job queue, server-sent events, read replica, or chart library.

The real risks are about personal data, about what counts as one "record", and about saving answers correctly.

### 1. Personal data of minors (highest risk)

* **The prototype's rule is being reversed.** The prototype deliberately kept answers in memory only, citing [DP-001] (`app.js:40`). Storing answers, timing, scores, and contact details is a policy change. It is not just a port.
* **Marketing consent from minors.** The MyPath form collects phone, email, and consent for sales to make contact. Most users are under 20. Under Thailand's PDPA (section 20), a minor's consent may need a parent or guardian's agreement. The consent collected upstream was for a different purpose, so it probably does not cover OnDemand sales contact. **A DPO or Legal must confirm this before the contact form ships.** Reference: PDPA B.E. 2562, https://www.mdes.go.th/law/detail/3577
* **If the contact form stays:**
  * Leave the checkbox unticked by default and keep it visually separate from the Download button.
  * Write plain Thai that says who will contact the student, how, and how to opt out.
  * Store `consent_at` and the consent text version.
  * Keep contact details in their own table.
  * Do not store phone or email when consent is not given, unless Legal decides otherwise.
* **Every row is identifiable.** Upstream can link `code` back to a real student, so the whole table is personal data about minors. The design needs a short data dictionary that gives each field's purpose, its legal basis, how long it is kept, and who can see it.
* **Free-text "desired career".** Students can type anything into this box, including names or sensitive information. Limit its length, keep it out of list views and logs, or replace it with a pick from the occupation list.
* **Admins can see every student.** Mask contact details in lists. Show them only for students who consented. Write an audit row when an admin opens a student's detail page. Add no bulk export this round (later superseded by `docs/adr/0003-student-export.md`).
* **Deletion has to cover everything.** A purge that depends on someone remembering to run it gets forgotten. Measure age from `created_at`. Declare every child table's foreign key with `.onDelete('CASCADE')`. Support `--dry-run`. Log only counts. Run it from a host cron if possible. Backups and logs also keep data, so their retention needs to be written down. After a purge the "all time" funnel only covers 60 days, so label it that way.

### 2. What one "record" means

The concept uses "student record" for three different things: a visit, a test attempt, and a person. If the rules for resume, redo, extending to 60 items, and viewing an old result are not defined, the funnel and repeat counts will come out wrong.

The reviewers propose calling the row an **attempt** and fixing these rules:

| Action | Effect on rows |
|---|---|
| Resume an unfinished test | Same attempt |
| Extend 30 → 60 (deferred) | Same attempt |
| View old result | No new row |
| Redo | New attempt. The old one is left read-only, and both scores start empty. |
| Same code, new attempt | Counted as a repeat attempt |

**Do not create the attempt when someone opens Home.** LINE, Facebook, and Messenger fetch links to build previews before anyone taps them. Refreshes, the back button, and bots also load the page. All of this would inflate the 5-minute chart and the funnel. Create the attempt when the student presses **Start**, as a POST request. On refresh, reuse the attempt in the browser cookie. This changes what the chart counts: "students who pressed Start" instead of "page opens".

### 3. Student cookie

* Store a random UUID in an encrypted, httpOnly cookie that lasts 60 days. Never store a sequential ID, because then anyone could read other students' records by changing the number.
* The current session and app cookie lasts 2 hours (`config/session.ts:26`), which would break resume.
* School and family phones are often shared. Ignore the cookie when the incoming `?code` is different from the one the cookie was made with, and add a "ไม่ใช่ฉัน / เริ่มใหม่" button.
* After storing `code`, remove it from the URL. `forwardQueryString: true` (`config/app.ts:49`) would otherwise carry it into browser history and Referer headers.
* Check that `code` is a reasonable length and uses expected characters. Store it as opaque text, and never log it.

### 4. Saving answers correctly

* **Store the current answer.** In the prototype, students can go back and change answers, and the invalid-profile screen tells them to (`app.js:184,198,337`). v1 stores the current value, used for resume and scoring. The first value and its timing were only needed for timing analytics, which is deferred.
* **Double taps and retries.** Phones on school Wi-Fi retry requests and send them out of order. Store answers in an `answers` table with a composite unique index on (attempt_id, item_id), added in the migration with `table.unique(['attempt_id', 'item_id'])`. Save with Lucid's `Answer.updateOrCreate({ attemptId, itemId }, { value })`. If two first saves race, the unique index rejects the second insert. Catch that error and retry once, so a retry is harmless. Scores are computed on the server, once, when the 30th answer arrives. Never accept scores sent from the browser.
* **CSRF.** CSRF protection is on (`config/shield.ts:33`), so a plain `fetch` will fail. Save through Inertia, or send the XSRF header.
* **Bad networks.** Move to the next question right away and retry saving in the background. Show a Thai "บันทึกไม่สำเร็จ แตะเพื่อลองใหม่" notice only after repeated failures. Block "ดูผล" until the server has every answer.
* **Timing (deferred).** When it returns, measure with `performance.now()`, pause while the tab is hidden, clamp on the server (e.g. 0–600 s), and store the median per form.
* **Step fields only move forward.** Put this rule in one model method, `attempt.reachStep(step)`. It raises `furthestStep` only when the new step is further, and sets `enteredXAt` only when it is still empty. Constrain the column in the migration with `checkIn([...steps])`.

### 5. Owner, Admin, member

* Nothing in the codebase enforces the rules yet. The users table has no role column, and signup creates a plain user (`new_account_controller.ts:10`).
* "Exactly one Owner" has to be enforced. Two people signing up at the same moment could both become Owner. A transfer that fails halfway could leave no Owner at all. Add a `role` column with `checkIn(['owner', 'admin', 'member'])`, typed as a union in `database/schema_rules.ts`. Run "transfer ownership" inside `db.transaction` and lock both user rows with `forUpdate()`, so the demotion and the promotion succeed or fail together. `forUpdate()` cannot protect the very first signup, because no row exists yet to lock. The author accepts that small window. The only full guard is a partial unique index on `role = 'owner'`. The Lucid table builder cannot express it, so it would need `this.schema.raw()`. Not added (author decision, round 2).
* Block Owner self-delete on the server, not only in the UI.
* Check roles in one middleware. Three roles do not justify adding Bouncer.
* Deleting an admin account must not delete any student data.
* The author accepts the first-signup risk; first signup stays (round 2).

### 6. Moving from the prototype and from SQLite

* **PostgreSQL is not set up yet.**
  * `config/database.ts` defaults to SQLite.
  * The commented-out pg block uses `env` without importing it.
  * `pg` is not installed.
  * The tests have no database setup.

  Make this the first task. Use Postgres in dev, test, and CI. Run tests inside a transaction per test (`ai-knowledges/adonisjs7/reset-state-between-test.md`). Declare timestamps with `table.timestamp('x', { useTz: true })`.
* **Port scoring exactly.** `scoring.js` and `majors.js` contain rules that are easy to break:
  * Question order, and where question 31 continues into the 60-item form.
  * The tie order between RIASEC types.
  * "All dislike" is checked before "flat profile".
  * Only Job Zones 4–5 are matched.
  * Postsecondary teachers are removed.
  * Correlations below 0 are dropped and only the top 5 kept.
  * Fit cut-offs are .729 and .608.

  Port them as pure TypeScript with no logic changes, as services created with `node ace make:service` (for example `app/services/scoring_service.ts`, `app/services/majors_service.ts`). Port the existing tests too, into the `unit` suite. Add about 20 fixed answer sets whose output must equal the prototype's output exactly.
* **Data files.** `build.py` reads from `../learn_tcas` and cannot run in this repo. Keep it in the prototype repo as the only data pipeline, and copy the generated JSON here. Store a content version on each attempt, because the Thai translation and the TCAS mapping are drafts and will change. Never send the 2 MB `tcas_programs.json` or all 923 occupations to the browser. Run matching on the server and send only the results.

### 7. Phones and LINE

* Many students will open the link inside LINE's built-in browser. Its cookies are separate from Safari or Chrome and can be cleared, and PDF downloads often fail inside iOS in-app browsers.
  * Detect in-app browsers and suggest "เปิดใน Safari/Chrome".
  * Serve the PDF from a plain GET URL.
  * Make the Result page easy to screenshot.
  * Test on real phones.
* At the start of a class, 400 phones load the app at once through one school connection. Keep the first test screen under about 200 KB and cache static files. Load-test 400 virtual students ramping up over 10 seconds and answering 60 items each, with zero lost answers as the release gate.

### 8. Design system

The prototype has about 21 CSS custom properties. Port them into the starter's token pattern. Remove the starter's dark theme and theme toggle, because the Sticker Lab theme is light only by choice. Self-host the Mali and IBM Plex Sans Thai Looped fonts instead of loading them from Google. Put reusable parts in `inertia/components/ui/` and the profiler screens in `inertia/pages/profiler/`. Do not add Storybook or a UI library.

### 9. Dashboard

* Get the bucket counts with one Lucid query: `Attempt.query().where('created_at', '>=', since)`, selecting a `db.raw` `date_bin` expression and grouping by it. Fill the empty buckets with 0 in TypeScript, which is simpler than `generate_series`. Store UTC and show Bangkok time with luxon.
* Get funnel counts with `Attempt.query().groupBy('furthest_step').count('* as total')`.
* Index `created_at` and `furthest_step` in the migration (`.index()`).
* Draw bars with CSS widths. Refresh with Inertia's `usePoll` or a small JSON endpoint, and pause while the tab is hidden. A 5-second refresh from a handful of admins is cheap.
* Raw counts are inflated by repeat attempts. Also show rates: Result reached ÷ started, and Download ÷ Result reached. Define each event in a tooltip.

### 10. Operations

* The logger has no redaction, and `APP_NAME` is not declared (`config/logger.ts:21`). Redact phone, email, code, desired career, passwords, and cookies. Never log query bindings in production.
* Add `/health` with a database check.
* Log answer-save failures as structured events so a failed class session can be investigated.

### 11. Content and licence

* The O*NET attribution (CC BY 4.0, with the modification and no-endorsement notice) appears today only on the prototype landing page. Show it on Result, Career, and the PDF, and add a test that checks it is there.
* The Thai item translation, Thai occupation titles, and TCAS mapping are AI drafts that no person has reviewed. Make human review a launch gate, with a named owner.
* Check the O*NET Tools Developer License requirement to validate adapted instruments: https://www.onetcenter.org/license_toolsdev.html

### 12. Building it the AdonisJS Way

The rules and the guide index live in `AGENTS.md`, which `CLAUDE.md` loads. In short:

* Read the matching guide in `ai-knowledges/` before writing code.
* Create every file with its `node ace make:*` command, so migration timestamps, names, and locations are right.
* Define tables, indexes, foreign keys, and checks with the Lucid table builder.
* Models extend the generated `database/schema.ts` and add only relationships and domain methods. Column TS types go in `schema_rules.ts`.
* Read and write data through Lucid models, the query builder, and `db.transaction`.
* Send data to pages through transformers. Validate input with VineJS validators.
* Planned files:

  | Kind | Files |
  | --- | --- |
  | Models | `Attempt`, `Answer`, `CareerView`, `StudentContact`, `AdminAudit`, plus a `role` column on `User` |
  | Services | `ScoringService`, `MajorsService`, `DashboardService` |
  | Middleware | `role` (owner, admin) |
  | Command | `students:purge` |

## Goals vs. Non-Goals

* **In-scope goals**
  * The student flow from Home to MyPath, on React, with per-answer saving and resume in the same browser.
  * Tracking: the furthest step and the time each step was first reached, current answers, 30-item R–C scores in separate columns, career detail views, downloads, and consent.
  * Admin accounts with Owner, Admin, and member roles, plus a self-service Account page.
  * The dashboard: funnel counts and Result and Download counts, refreshed by Inertia polling.
  * Student list and detail pages for admins.
  * PostgreSQL, a design system from Sticker Lab tokens, unit tests that prove the scoring matches the prototype, functional tests, and a load test.
  * A purge command for 60-day retention.
* **Out-of-scope non-goals**
  * Real study-plan (MyPath) content. A results PDF stands in for it this round.
  * Student accounts and resume across devices.
  * Deferred by YAGNI (round 2): per-item timing and median, first-answer storage, the 60-item extension, and the 36-bar dashboard chart.
  * Averages across students, which will be analysed later from the stored data.
  * Bulk export of student data.
  * A dark theme.
  * Redis, queues, live push, and chart libraries.
  * Changing the scoring algorithm or the data pipeline.

## Alternatives Weighed

* **Create the record on GET Home.** Rejected in review and by the author (round 3): link-preview bots, refreshes, and back navigation create fake records. Records are created when Start is pressed instead. This changes the meaning of the chart, so the author should confirm.
* **Keep answers only as one JSON field.** Reviewers advised against it: a read-modify-write on one JSON field loses answers when two saves arrive at once. They propose an answers table as the source of truth. The JSON field and score columns can stay as a snapshot and cache.
* **Store "first answer only" for scoring.** Rejected in review: it conflicts with going back and changing answers. Both first and current values are kept.
* **Per-item timing, 60-item extension, 36-bar chart in v1.** Deferred by the author (round 2) on YAGNI grounds: no decision depends on them yet. Timing is also extra behavioural data about minors.
* **Partial unique index for one Owner.** Rejected by the author (round 2): first signup stays, and the small race window is accepted rather than adding `schema.raw`.
* **Raw SQL for constraints and upserts (partial unique index, `ON CONFLICT`, `GREATEST`/`COALESCE`).** Rejected by the author in favour of the AdonisJS Way: use the Lucid table builder, model methods, and transactions. `this.schema.raw()` / `db.raw` remain for expressions Lucid cannot write, such as `date_bin`.
* **Cookie session lifetime (2 h) for resume.** Rejected: it is too short. Use a separate encrypted cookie that lasts 60 days.
* **SQLite.** Rejected by the author in favour of PostgreSQL.
* **Real-time push (SSE or Transmit) for the dashboard.** Rejected: 5-second polling is enough for a few admins.
* **Bouncer for roles.** Rejected: one middleware check covers three roles.
* **Rewriting scoring from scratch.** Rejected: port it unchanged and prove the output matches the prototype.

## Key Decisions & Staging for Next Steps

### Resolved decisions

* **First Owner:** first signup, no extra guard (round 2).
* **YAGNI defer list accepted:** per-item timing, 60-item extension, 36-bar chart (round 2).
* **Contact capture:** keep the MyPath phone and email form with the sales-consent checkbox in v1 (round 3). It ships only after DPO or Legal approves the consent wording and the rule for minors (phase P2 gate).
* **Attempt creation:** on pressing Start (POST), never on opening Home (round 3). The dashboard counts "students who pressed Start".
* **Rate limiting:** not in v1 (round 3). Creating attempts on POST already filters bots and link previews. Add `@adonisjs/limiter` if the counts look abnormal. The limit must allow a whole classroom behind one school IP.

### Proposed phases

| Phase | Content | Gate |
|---|---|---|
| P0 | PostgreSQL, CI with a Postgres container, design tokens and fonts, scoring port, tests proving output matches the prototype | Scoring output identical |
| P1 | Student flow (Home → Test → Result → Career), attempts, answers table, cookie resume, step tracking | Load test: 400 virtual students, zero lost answers |
| P2 | MyPath download, contact and consent form, purge command, log redaction | Legal approved (2026-11-06); ship the approved consent text verbatim |
| P3 | Admin accounts: roles, Account page, Owner transfer | Test proves transfer leaves exactly one Owner |
| P4 | Dashboard (counts only), then student list and detail (masked and audited) | Event definitions written down |
| Later | 60-item extension, per-item timing, 36-bar chart, real MyPath content | A decision that needs the data |

### Needs human verification before external use

* ~~How PDPA treats consent from minors~~: Legal approved (author report, 2026-11-06). Keep the approved consent text and its version in the repo.
* ~~O*NET licence terms on validating an adapted instrument~~: Legal confirmed with O*NET (author report, 2026-11-06). Keep the written confirmation on file.
* Human review of the Thai translation and the TCAS mapping.
* LINE in-app browser behaviour on real iOS and Android phones.
* All load and size figures are estimates, not measurements.
