# NPS on the careers page: 0–10, cohort-based, comments in the export

Students are asked one Net Promoter Score question, "อยากชวนเพื่อนมาลองแบบทดสอบนี้แค่ไหน?", on the five-careers page, below the careers and above the bottom save button. The card was chosen over a bottom sheet (it covered the save button) and a strip after the third career (it interrupted the list), from a prototype kept on branch `prototype/nps-placement`.

The scale is 0–10 with the standard bands: Detractor 0–6, Passive 7–8, Promoter 9–10. NPS = % Promoters − % Detractors. The first idea was 1–10 with cut-offs at 5 and 8. It was dropped because its numbers could not be compared with any other NPS.

A score is saved on tap and replaced by a later tap, so a student who never types still counts. The follow-up question depends on the band, and the comment is stored only when the student presses ส่ง (`sent_at`). There is one row per attempt in `nps_responses`, deleted with the attempt (`ON DELETE CASCADE`), so the retention purge removes it.

The report counts NPS over the same cohort as every other figure (attempts started in the range). The response rate is over `attempts.careers_viewed_at`, which is the first time the careers list was opened. It is not over the Career step, because that step means opening one career's page and many students answer without doing so. Comments open on their own page, `/admin/report/nps`, filtered by band, with no link back to the attempt.

## Considered Options

- **A slider**: rejected. Its starting position anchors the answer, and picking one exact number is fiddly on a phone.
- **Leave comments out of the CSV**: rejected. The data team wants them beside the scores and the career data.
- **Use the Career step as the response-rate denominator**: rejected, because the rate could pass 100%.

## Consequences

- `nps_comment` puts free text from minors in the same CSV as their phone and email. The box asks for no name or phone, but nothing stops a student typing one. The comment is never logged, and copies of the CSV fall under ADR 0003's warnings [DP-001].
- `careers_viewed_at` is set only from this change onward. Cohorts from before it show a 0 denominator ("–").
