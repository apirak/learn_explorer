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

**Interest code**:
The three RIASEC letters a finished test produces. Not a code in the sense above.
_Avoid_: result code

## Flow and reporting

**Step**:
A stage of the flow an attempt can reach: Start, Test complete, Result, Career, MyPath, Download. An attempt's furthest step never moves backward.

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
