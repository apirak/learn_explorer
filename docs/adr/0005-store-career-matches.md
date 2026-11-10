# Store career matches and test time when an attempt is scored

Admins want to compare the career a student wants (desired career) with the careers the system matched, and to set aside attempts done too fast to trust. Until now the top 5 occupations were recomputed from the answers on every page open and never stored, and test time existed only as answer gaps.

Each time an attempt is scored on the Result or careers page, its career matches (`career_matches`: rank 1–5, occupation code, `r`) are replaced with the latest ones, and `attempts.test_time_ms` and `attempts.matched_at` are set, in one transaction that locks the attempt row. The latest wins because a student can go back and change answers, and the admin should see what the student last saw. An invalid profile (`all-dislike`, `flat`) stores no matches but still gets `matched_at`, so "computed, nothing to match" is told apart from "not computed yet".

Test time is the sum of the attempt's answer gaps of 5 minutes or less (ADR 0001's "left and came back" rule, shared with the Report through `MAX_GAP_MS`). It leaves out the first answer, which has no gap, and is null when no gap counts.

Attempts scored before this change are filled in by a backfill button on the Career matches page, 500 attempts per press, oldest first, using the content version deployed at the time, not the one the student took the test on.

## Considered Options

- **Recompute on every admin view**: rejected. The list must filter and page on test time and search across many attempts, and recomputing 5 Pearson rankings per row per page is wasted work. A stored copy also stays put if the occupation content changes later.
- **Keep the first matches only**: rejected. A student who changed answers would be judged on careers they never saw last.
- **A JSON column on `attempts`**: rejected for a child table, which can be queried (how often an occupation is matched) and shares `occupation_code` with `career_views`.
- **An ace command for the backfill**: rejected in favour of a button, so staff can run it without a deploy step. It is batched so one request never runs long.

## Consequences

- Opening the Result or careers page now writes up to 5 rows. At current volume this is negligible.
- Backfilled matches use the current content, so an attempt from an older content version may show careers it was never shown.
- `career_matches` rows cascade with their attempt, so the retention purge removes them.
