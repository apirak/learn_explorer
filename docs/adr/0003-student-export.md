# Students page exports a CSV with full contact details

The v1 brief and design left bulk export out of scope ("Add no bulk export this round"). This reverses that decision. The Students page now has an Export CSV button, available to `admin` and `owner`. It downloads every attempt that matches the list's filters, one row per attempt, with scores, step times, consent status and the full phone and email. A separate button downloads `resources/exports/students.md`, an English column guide written so an AI assistant can analyse the file without other context. A test checks that every CSV header has an entry in the guide.

The file is for internal use. The data team analyses it, and the sales team contacts students who consented. The consent text promises that OnDemand will contact students about study plans and courses, which covers the sales use.

## Considered Options

- **No contact details, only a `has_consent` flag**: enough for analysis. Rejected because sales needs the phone and email.
- **Owner only, or audit each export in `admin_audits`**: rejected for now. Admins can already open any student's full contact one at a time.
- **Score attempts when the last answer is saved, so the export never misses scores**: rejected because it breaks [M1], which keeps `POST /test/answers` free of scoring. Scores are stored whenever the result, careers or MyPath page opens, so the only gap is a student who closes the app between the last answer and the result. `node ace backfill:scores` fills that gap and can be run again safely.

## Consequences

- Admins can take every consented minor's phone and email out of the system in one click, and nothing records that they did. Revisit the audit decision if an incident or a DPO review asks who exported what.
- **Before launch, Legal must confirm** that the final consent text, which replaces `placeholder-2026-11`, covers the internal sales team receiving the exported contact details [DP-001].
- Copies of the file live outside the retention purge, so a student's deletion request cannot reach them. The column guide tells readers to keep copies short-lived and to strip phone and email before using AI tools.
- The CSV is built in memory. That is fine at the current volume, but it should stream once one export reaches hundreds of thousands of rows.
