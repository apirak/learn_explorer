# Answer gap comes from server save times, computed when the answer is saved

The Report shows how long students take per test item. We measure this as the answer gap: the server time an answer is first saved minus the save time of the attempt's previous answer. The gap is computed once at insert and stored in milliseconds on the answer. Changing an answer leaves the gap alone. The first answer of an attempt has no gap. At read time the Report drops gaps over 5 minutes as "left and came back". Gaps are stored raw so this threshold can change without rewriting data.

## Considered Options

- **Client-measured time (item shown → tapped)**: the most accurate, but it needs front-end timing code. Rejected because server timestamps are good enough to tell whether students think at all.
- **Computing gaps with `LAG()` when the Report opens**: needs no column. Rejected because at about 3,000 attempts a day, a 60-day range is around 5.4M answers to window-sort on every view. Storing the gap costs one index lookup per insert, and the Report becomes a plain `GROUP BY`.

## Consequences

- When a student's offline answer queue flushes, it saves several answers back to back. Their gaps come out near zero and inflate the "<1 s" bucket. The Report notes this under the chart.
- Answers saved before the column existed have no gap. There was no backfill, because the app was not yet in real use.
- A gap is capped at the int column's maximum (about 24.8 days), so a student who returns weeks later still saves the answer. The 5-minute read filter drops it anyway.
