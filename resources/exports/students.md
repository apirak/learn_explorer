# Learn Explorer student export: column guide

This file explains the CSV you get from **Admin → Students → Export CSV** in Learn Explorer. Give it to an AI assistant together with the CSV, or read it yourself before you analyse the data.

## What Learn Explorer is

Learn Explorer is a web app run by OnDemand, a Thai tutoring company. Thai high-school students take a short career-interest test there. The test is the O\*NET Mini Interest Profiler (Mini-IP): 30 activity items, such as "build kitchen cabinets", translated into Thai. For each item the student says how much they would like to do it. The answers produce six RIASEC scores and a three-letter interest code. The app then suggests matching careers and study paths, and gives the student a page of results to save.

The flow has these steps, in order:

1. **Start**: the student opens the app, optionally types a career they already have in mind, and presses Start. This creates an attempt.
2. **Test**: the student answers the 30 items.
3. **Result**: the student sees their interest code and scores.
4. **Career**: the student browses matching careers and opens their details.
5. **Print prep**: the page before the printable result. The student can leave a phone or email, and optionally a name (with consent), and can download their result page.

## Key terms

- **Attempt**: one run through the flow, starting when a student presses Start. A restart creates a new attempt. Resuming later continues the same attempt. **Each CSV row is one attempt, not one person.**
- **Student**: the person behind one or more attempts. There is no login, so a student is approximated by the `code`. A campaign code comes from the link, so it stays the same on any device. A no-code code lives in one browser, so the same person on two browsers shows up as two no-code codes. An attempt with no code (only possible in old data, see `code`) counts as a student on its own.
- **Code**: the identifier an attempt carries. It is either a campaign code or a no-code code.
- **Campaign code**: a code issued by another OnDemand system and passed in through the link the student opened. It names a campaign, and the issuing system can map it back to a real student.
- **No-code code**: a code that starts with `NC-`, such as `NC-7QX4M`. Learn Explorer gives one to a student who arrived without a campaign code. Repeat attempts in the same browser share it.
- **RIASEC**: Holland's six interest types: **R**ealistic, **I**nvestigative, **A**rtistic, **S**ocial, **E**nterprising, **C**onventional.
- **Interest code**: the student's three highest RIASEC types, highest first, such as `SAE`. It is not a "code" in the sense above.
- **Furthest step**: the furthest step an attempt has reached. It never moves backward.

## Reading the data correctly

- **Rows are attempts.** To count people, use distinct `code`. Treat any attempt with an empty `code` as a separate person. One person often has several attempts, for example after a restart.
- **Scores exist only for finished tests.** The six `score_*` columns, `interest_code` and `profile_status` are filled once the student has answered all 30 items and opened the result page. Otherwise they are empty. An attempt with `answer_count` = 30 and empty scores means the student closed the app before the result appeared. An admin can fill these in by running `node ace backfill:scores`.
- **Scores follow the latest answers.** A student can change an answer after seeing the result. The stored scores are updated the next time they open the result, career or Print prep page.
- **Each score ranges from 0 to 20.** Each RIASEC type has 5 items, and each answer is worth 0 to 4. The answer scale is: 0 = would not want to do it at all, 1 = would not want to, 2 = not sure, 3 = would want to, 4 = would very much want to.
- **Ties in the interest code** are broken in R-I-A-S-E-C order. A student with equal S and A scores gets `S` after `A`.
- **Timestamps** are ISO 8601 in Bangkok time (UTC+07:00), for example `2026-11-08T14:05:31.120+07:00`. An empty timestamp means the student has not reached that step yet.
- **Old data is deleted.** Learn Explorer keeps attempts for a set number of days. The default is 60, and admins can change it. The export only contains attempts still in the database, so for long-term trends you need to keep earlier exports.
- **Filters apply.** The export contains exactly the attempts that match the Code and Furthest step filters on the Students page when you clicked Export. It covers every page of the list, not only the page on screen.

## File format

- CSV following RFC 4180, comma-separated, with a header row. Line endings are CRLF.
- UTF-8 with a byte-order mark (BOM), so Excel shows Thai text correctly.
- An empty field means null, or "not applicable".
- A text value that starts with `=`, `+`, `-`, `@`, a tab or a carriage return gets a leading `'`. This stops spreadsheets from running it as a formula. Remove the `'` if you need the raw text.
- Phone numbers start with `0`. Excel drops the leading zero if you open the file directly. Import the `phone` column as text.

## Columns

### attempt_uuid

- **Meaning**: the attempt's permanent, unique identifier. Use it as the row key.
- **Source**: `attempts.uuid`.
- **Type**: UUID string. Never empty.

### code

- **Meaning**: the code the attempt carries. See Key terms.
- **Source**: `attempts.code`.
- **Type**: text, up to 64 characters. Every new attempt gets a code (a no-code code when the link had none), so an empty value only appears on attempts created before no-code codes existed.
- **Note**: if someone sent a code starting with `NC-` through the link, it is stored as `M-NC-…` to keep it apart from codes Learn Explorer generates.

### code_type

- **Meaning**: what kind of code `code` is.
- **Source**: derived from `attempts.code`.
- **Values**: `campaign` (issued by another OnDemand system), `no_code` (starts with `NC-`, generated by Learn Explorer), or empty when `code` is empty (old data only).

### furthest_step

- **Meaning**: the furthest step this attempt has reached.
- **Source**: `attempts.furthest_step`.
- **Values**, in flow order: `test` (started, possibly mid-test), `result` (saw the result), `career` (opened at least one career's detail page), `print_prep` (reached Print prep).

### started_at

- **Meaning**: when the student pressed Start and the attempt was created.
- **Source**: `attempts.created_at`.
- **Type**: timestamp. Never empty.

### result_at

- **Meaning**: the first time the student opened the result page.
- **Source**: `attempts.result_at`.
- **Type**: timestamp. Empty if they have not reached it.

### career_at

- **Meaning**: the first time the student opened one career's detail page. Viewing only the list of matches does not set it.
- **Source**: `attempts.career_at`.
- **Type**: timestamp. Empty if they have not reached it.

### print_prep_at

- **Meaning**: the first time the student opened Print prep.
- **Source**: `attempts.print_prep_at`.
- **Type**: timestamp. Empty if they have not reached it.

### downloaded_at

- **Meaning**: the first time the student downloaded their result from Print prep. That is either pressing Download on Print prep, or opening Print prep after they had already left contact details, which takes them straight to the printable page.
- **Source**: `attempts.downloaded_at`.
- **Type**: timestamp. Empty if they never downloaded. Later downloads do not change it.

### answer_count

- **Meaning**: how many of the 30 test items the student has answered.
- **Source**: count of rows in `answers` for this attempt.
- **Type**: integer, 0 to 30. Use 30 to mean "test complete".

### score_r, score_i, score_a, score_s, score_e, score_c

- **Meaning**: the student's score for each RIASEC type: Realistic, Investigative, Artistic, Social, Enterprising, Conventional. Higher means more interest.
- **Source**: `attempts.score_r` … `attempts.score_c`. Each is the sum of the student's answers (0 to 4) on that type's 5 items.
- **Type**: integer, 0 to 20. Empty until the test is complete and scored. See "Reading the data correctly".

### interest_code

- **Meaning**: the student's three highest RIASEC types, highest first, such as `IRC`.
- **Source**: `attempts.interest_code`, derived from the six scores.
- **Type**: three letters drawn from R, I, A, S, E, C. Empty until scored.
- **Note**: when `profile_status` is not `ok`, the code is not meaningful. It is then just the first three letters in R-I-A-S-E-C order.

### profile_status

- **Meaning**: whether the score profile can be interpreted.
- **Source**: `attempts.profile_status`, derived from the six scores.
- **Values**: `ok` (normal profile), `all-dislike` (every score is 0, so the student answered "would not want to do it at all" to everything and the result is probably invalid), `flat` (all six scores are equal and above 0, so there is no shape to interpret). Empty until scored.
- **Note**: students whose status is not `ok` are not shown career matches.

### desired_career

- **Meaning**: the career the student typed on the Start page, before taking the test, as their current idea. It is free text, mostly in Thai. Compare it with `interest_code` to see whether the test agrees with their prior idea.
- **Source**: `attempts.desired_career`.
- **Type**: text, up to 100 characters. Empty if the student left it blank. It is not validated, so expect typos, jokes and blank-looking values.

### career_view_count

- **Meaning**: how many different careers the student opened the detail page of. This is a rough measure of engagement in the career step.
- **Source**: count of rows in `career_views` for this attempt. Learn Explorer records each career once per attempt, so opening the same career twice counts once.
- **Type**: integer, 0 or more.

### career_save_count

- **Meaning**: how many different careers the student pressed "เก็บอาชีพนี้ไว้ดูทีหลัง" on, which opens the browser's print dialog to keep that career's page as a PDF. It counts presses, not files: a student who cancels the dialog still counts. This is separate from `downloaded_at`, which is about the whole result after Print prep.
- **Source**: count of rows in `career_views` for this attempt that have a save time. Each career counts once, however many times it was saved.
- **Type**: integer, 0 up to `career_view_count`.

### nps_score

- **Meaning**: the student's answer to "อยากชวนเพื่อนมาลองแบบทดสอบนี้แค่ไหน?" (how likely they are to invite a friend to take the test), asked on the five-careers page. This is a Net Promoter Score (NPS) question. 0–6 is a Detractor, 7–8 a Passive and 9–10 a Promoter. NPS for a group of rows = % Promoters − % Detractors.
- **Source**: `nps_responses.score`. Saved as soon as the student taps a number; a later tap overwrites it, so this is their last choice.
- **Type**: integer 0–10. Empty when the student did not answer.

### nps_comment

- **Meaning**: what the student typed under the score, then sent. The question depended on the score: 0–6 "ตรงไหนที่ยังไม่โดนใจ?" (what didn't you like), 7–8 "ปรับอะไรถึงจะได้ 10?" (what would make it a 10), 9–10 "ชอบตรงไหนที่สุด?" (what did you like most).
- **Source**: `nps_responses.comment`, stored only when the student pressed ส่ง (send).
- **Type**: free text in Thai, up to 500 characters, typed by a minor. Empty when there is no comment. The box asks for no name or phone, but a student may still have typed one, so treat it as personal data [DP-001].

### has_consent

- **Meaning**: whether the student left a phone number or email (and optionally a name) and ticked the consent box agreeing that OnDemand may contact them.
- **Source**: `true` when a `student_contacts` row exists for the attempt. Learn Explorer only stores contact details together with consent.
- **Values**: `true` or `false`.

### consent_at

- **Meaning**: when the student last gave consent, which is also when they last saved their contact details.
- **Source**: `student_contacts.consent_at`.
- **Type**: timestamp. Empty when `has_consent` is `false`.

### consent_version

- **Meaning**: the version of the consent text the student agreed to. Check the wording of that version before you use the contact details for a new purpose.
- **Source**: `student_contacts.consent_version`.
- **Type**: text, the name of the consent file, such as `placeholder-2026-11`. A version starting with `placeholder` means a development draft, not the Legal-approved text. Empty when `has_consent` is `false`.

### contact_source

- **Meaning**: the page where the student first left their contact details.
- **Source**: `student_contacts.source`.
- **Values**: `contact` (the contact step between the result and the careers, shown to students without a campaign code) or `print_prep` (the Print prep page). Empty when `has_consent` is `false`.

### name

- **Meaning**: the name or nickname the student gave for themself, used to greet them when OnDemand calls. Always the student's own, never a parent's. **Personal data of a minor.**
- **Source**: `student_contacts.name`.
- **Type**: free text, up to 100 characters, as typed. It may be a nickname, not a legal name. Empty if the student gave none.

### phone

- **Meaning**: the student's phone number. **Personal data of a minor.**
- **Source**: `student_contacts.phone`.
- **Type**: 9 to 10 digits starting with `0`. Spaces and dashes are removed and `+66` becomes `0`. Empty if the student gave none.

### email

- **Meaning**: the student's email address. **Personal data of a minor.**
- **Source**: `student_contacts.email`.
- **Type**: text. Empty if the student gave none.

## Personal data rules (PDPA)

Students are mostly under 20, so this file contains personal data of minors under Thailand's Personal Data Protection Act (PDPA) and OnDemand's Data Protection Policy [DP-001].

- Use the file inside OnDemand only. The consent asks whether OnDemand may contact the student about study plans and courses that fit their results. Do not use the contact details for any other purpose. The final consent wording is still pending Legal approval, so check the text of each `consent_version` before you rely on it.
- **Never paste `name`, `phone`, `email` or `code` into an external AI tool, website or spreadsheet service.** For analysis with AI, first delete the `name`, `phone` and `email` columns. Replace `code` too if it could identify a student.
- Do not keep copies longer than you need them. Learn Explorer deletes attempts after its retention period, and a student can ask OnDemand to delete their data at any time. Copies you keep must honour that request too.
