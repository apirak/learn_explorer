# Stage 5: Initial Zoom Out Review

* **Target:** `docs/designs/learn_explorer_v1.md` (full file, lines 1–1044)
* **Reviewer:** egm-zoom-out (fresh context)
* **Standard:** `zoom-out-standard.md`
* **GoldfishContext:** `concepts_brief.md`, `AGENTS.md`
* **Date:** 2026-11-06

**Verdict: Approve with changes.**

| Severity | Count |
|---|---|
| Blocker | 0 |
| Major | 5 |
| Nit | 8 |

**What passes:**

* **Context check:** the objective and the reasons for it are clear.
* **Architecture:** it is already lean. It has one server and no Redis, queue or server-sent events. It reuses the Tuyau client and uses one role middleware instead of Bouncer.
* **Root-problem alignment:** the design targets the stated problems: counting the funnel, follow-up with consent, resume, and maintainability.

Elephant spot-check: the Elephant (the main session) confirmed M3 and N7 against the code. `inertia/css/app.css:97` defines `.btn` and its variants. The `dashboard` route is used in `session_controller.ts:15`, `layouts/app.tsx:13` and `layouts/marketing.tsx:18`.

## Major

### M1. Scoring sits on the answer-write path and re-runs under a row lock on every later change

* **Where:** "Saving answers → Scoring" and "Changing an answer after scoring"; items 27 and 28.
* **Problem:** Once an attempt has 30 answers, every answer save opens a transaction, locks the attempt with `forUpdate()`, and re-scores it. That includes every Back or "กลับไปทบทวน" edit. This puts locking on the endpoint the G2 load test is gating, and it needs its own idempotency and early-return logic.
* **Fix:**
    * Score on `GET /result`, which already requires 30 answers. It computes the scores from the `answers` table (a fast, pure function) and saves the score columns.
    * The answer endpoint then only runs `updateOrCreate` and returns `{answered, total}`.
    * The `forUpdate` lock, the early return, and the separate re-score path all go away.

### M2. `answers_json` duplicates the `answers` table

* **Where:** Technical Plan → Scoring, the Data model, Alternative H, items 22 and 28.
* **Problem:** The brief says the snapshot "can stay"; it does not require it. A second copy of minors' answers has to be kept in sync, typed, redacted and purged, and nothing reads it. This goes against data minimisation under [DP-001].
* **Fix:** Drop `answers_json`. Analysts can aggregate the `answers` table in a query when they need one row per attempt.

### M3. The design system rebuilds primitives the starter already has

* **Where:** Technical Plan → Design system; items 16, 18 and 53.
* **Problem:**
    * `inertia/css/app.css` already defines:
        * `.btn` with the `--primary`, `--secondary`, `--ghost`, `--block` and `--sm` variants;
        * `.field` with `__label`, `__input` and `__error`;
        * `.panel`.
    * The signup and login pages use these classes today.
    * The repo also has `Page`, `Section` and `SettingsLayout`.
    * Item 18 still plans new `Button`, `Card` and `Field` components.
* **Fix:**
    * Re-skin `.btn`, `.field` and `.panel` with the Sticker Lab tokens.
    * Build new components only for what is new: `LikertScale`, `ProgressBar`, `Attribution`, and possibly `Chip`.
    * Build the Account page on `SettingsLayout`, `Page` and `Section`.

### M4. The G2 release gate needs a staging environment that v1 does not have

* **Where:** G2, Open Questions → Hosting, item 38, Verification Plan.
* **Problem:** Deploy is out of scope, but the load test is set to run "against staging". The only hard release gate cannot run as the document describes it.
* **Fix:** Name a target that exists in v1. For example, run a local production build (`npm run build`, then `node bin/server.js`) against a local Postgres database. Or state that the gate moves together with the Railway work.

### M5. The `home` step and `home_at` carry no information

* **Where:** G1, `le_entry.homeAt`, the step table, the Data model, items 19 and 26.
* **Problem:**
    * Attempts are created with `furthest_step = 'test'`, so the `home` value never occurs and the funnel's Home bar is always 0.
    * `test_at` is the same as `created_at`.
    * `home_at` only measures how long a student took between Home and Start. No decision depends on that, which is the same YAGNI reason per-question timing was deferred.
* **Fix:**
    * Remove `home` from the step list.
    * Drop `home_at` and `le_entry.homeAt`.
    * Use `created_at` as the time the student entered Test.
    * Keep `le_entry` only to carry `code`.

## Nit

### N1. Content checksums duplicate git

* **Problem:** The SHA-256 manifest, the boot-time check and the checksum test all guard files that are committed to git and change about once a year.
* **Fix:** Keep the `content/vN/` folders and `content_version`. Drop the hashes and the boot-time verification.

### N2. `CONSENT_VERSION` as an env var

* **Problem:** The consent text is a committed file, so changing it already needs a deploy. An env var is a second source of truth that can disagree with the files in production.
* **Fix:** Use a code constant that names the current consent file, and add one test that fails if the name starts with `placeholder`.

### N3. The `form` column and form-aware APIs exist only for the deferred 60-item form

* **Problem:** The `form` column always holds `mini`, and `items(form)` takes a parameter with only one possible value.
* **Fix:** Add the column when the 60-item form returns. Keep the 60-item golden vectors only if they are free to generate.

### N4. The Technical Plan drops into implementation detail

* **Problem:** The architecture section contains code-level detail:
    * the backoff values (1, 2, 4, 8 and 15 seconds);
    * the code regex;
    * phone normalisation;
    * lists of getters;
    * the queue's internal fields.
* **Fix:** State the policy instead, for example "retry network failures with capped backoff; never retry 4xx". Leave the exact values to the code.

### N5. Counters that repeat each other

* **Problem:** `download_count` adds nothing to `downloaded_at`. `startedLast60Days` equals the sum of the step counts.
* **Fix:** Drop both.

### N6. Deploy-time features planned while deploy is out of scope

* **Problem:** Nothing probes `/health/live` or `/health/ready` in v1, and the rollout steps are out of scope.
* **Fix:** Move both to Future Improvements, or keep a single `/health` route.

### N7. Internal inconsistencies

* G6 says there is "always exactly one Owner", but the plan accepts a race on the very first signup. Reword G6 to "after any transfer".
* CUJ 9 and the Verification Plan list "downloads" as child rows, but downloads are columns on `attempts`.
* The Overview says students "download their study plan", but the Non-Goals rule out any downloadable file in v1.
* Item 53 deletes `pages/dashboard.tsx`, but these files still use the `dashboard` route:
    * `session_controller.ts:15` (the login redirect)
    * `layouts/app.tsx:13`
    * `layouts/marketing.tsx:18`

  Add all three to the plan.

### N8. Open signup creates a role that can do nothing

* **Problem:** Anyone can sign up, but a member can do nothing except edit their own account.
* **Consider:** Close signup once an Owner exists, and have the Owner invite staff instead. This is the author's scope decision.
