# Content v2

Same as v1 except TCAS programs: `tcas_programs.json` is replaced by `browse.json`.

- `browse.json` is copied byte for byte from `learn_tcas/data/browse.json`, built there with `pnpm browse`. Its mytcas data was fetched `2026-10-30T14:18:36+00:00` (`fetched_at`). It holds 4,145 programs with university code, campus, faculty, exam weights and rounds.
- The other files are copied unchanged from `content/v1/`. `build.py` in the prototype is still their only pipeline.
- Files in a version never change. Any update becomes a new folder `content/vN/` and a bump of `CONTENT_VERSION` in `app/services/content_service.ts`.
- `browse.json` (~2.5 MB) stays on the server. Send only the programs a page needs, through a transformer.
- Programs with `ly: true` carry last year's round-3 weights. Do not show exam weights to students until that is confirmed as allowed.
