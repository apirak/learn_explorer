# Content v1

Copied byte for byte from `learn_explorer_prototype/src/interest_profiler/data/` (prototype commit `194d531`). Do not edit these files.

- `build.py` in the prototype is the only pipeline. Hand-edited files (`items_th`, `riasec_types_th`, `occupation_titles_th`, `tcas_field_to_cip`) are edited there too.
- Any change becomes a new folder `content/v2/` and a bump of `CONTENT_VERSION` in `app/services/content_service.ts`.
- `tcas_programs.json` (~2 MB) stays on the server. Send only the programs a page needs, through a transformer.
- Several files are DRAFT (see each file's `status`): translations and the TCAS map are not reviewed yet.
