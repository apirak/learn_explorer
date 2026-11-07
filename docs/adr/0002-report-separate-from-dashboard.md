# Report is a separate page from the Dashboard

Both pages show a funnel, but they serve different needs. The Dashboard is watched live and polls every 5 seconds, so its queries must stay trivially cheap. The Report is opened occasionally and runs heavier cohort queries over a chosen date range (default: today, at most 60 days back because of retention). Keeping them apart stops Report features from slowing the live poll. Do not merge them.
