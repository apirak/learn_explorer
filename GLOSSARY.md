# Learn Explorer

A Thai RIASEC interest profiler for high-school students, and the admin pages OnDemand staff use to follow how students move through it.

## Students and attempts

**Attempt**:
One run through the flow, from the moment a student presses Start. A restart is a new attempt; resuming is the same one.
_Avoid_: record, visit, session

**Student**:
The person behind one or more attempts, approximated by distinct code. One student on two browsers counts as two; an attempt without a code counts as one student on its own.
_Avoid_: user, account

**Code**:
The identifier an attempt carries: either a campaign code or a no-code code.

**Campaign code**:
A code issued by another OnDemand system and brought in through the link. It names the campaign and can be mapped back to a real student upstream.

**No-code code**:
An `NC-` code this system gives a student who arrived without a campaign code, shared by repeat attempts on the same browser.
_Avoid_: anonymous code

**Contact**:
The details a student chooses to leave, with consent, so OnDemand can reach them: a phone or email, and optionally a name. Only kept when it has a phone or email.
_Avoid_: lead, sign-up

**Contact name**:
The name or nickname a student gives for themself in their contact, used to greet them when OnDemand reaches out. Always the student's own, never a parent's.
_Avoid_: full name, parent name

**Interest code**:
The three RIASEC letters a finished test produces. Not a code in the sense above.
_Avoid_: result code

## Flow and reporting

**Step**:
A stage of the flow an attempt can reach: Start, Test complete, Result, Career, Print prep, Download. An attempt's furthest step never moves backward.

**Careers list view**:
A student first opening the five-careers page. Recorded once per attempt, as the denominator of the NPS response rate. Not a step: the Career step is opening one career's own page.

**Print prep**:
The page reached from the five-careers page ("เก็บผลไว้ดูทีหลัง") where a student can leave a contact, then opens the printable result. A step; pressing its button is the Download.
_Avoid_: MyPath (reserved for the future study-plan feature, which will not live on this page)

**Career save**:
A student keeping one career's detail page as a PDF, straight from that page. What is known is the press of the save button, first time only, not that a file was actually kept. Not a step, and not a Download.
_Avoid_: career download

**Funnel**:
How many attempts reached each step, with the conversion and drop-off between steps.

**Cohort**:
The attempts started within a chosen date range (Bangkok time). Every report figure counts a cohort, wherever its later steps happened.
_Avoid_: period, events in range

**Incomplete attempt**:
An attempt in a cohort that has not answered all test items.
_Avoid_: unfinished student

**Answer gap**:
The time between an answer being saved and the previous answer of the same attempt being saved. Stands in for how long the student thought about an item.
_Avoid_: answer time, think time, duration

**Dashboard**:
The live admin page, refreshed every few seconds.

**Report**:
The admin page for occasional analysis over a chosen date range.

**Export**:
The CSV of attempts an admin downloads from the Students page, one row per attempt with full contact details, described column by column in `resources/exports/students.md` (ADR 0003).
_Avoid_: report, dump

## Feedback

**NPS response**:
A student's answer to "อยากชวนเพื่อนมาลองแบบทดสอบนี้แค่ไหน?" on the five-careers page: a score from 0 to 10, and an optional comment sent with it. One per attempt; a new tap replaces the score. Saved on tap, sent when the student presses ส่ง (ADR 0004).
_Avoid_: rating, feedback, survey

**Detractor / Passive / Promoter**:
The standard NPS bands of a score: 0–6, 7–8 and 9–10.

**NPS**:
% Promoters − % Detractors over a cohort's NPS responses, from −100 to 100.

**NPS comment**:
The text of a sent NPS response. Typed by a minor and may carry personal data, so never logged, and shown to staff without the attempt it came from.
