<!-- SI-assisted (Claude Code); reviewed by <name> -->
## What and why

<!-- One or two sentences. Link the issue: "Part of #N", or "Closes #N" only if every box of that issue is done. -->

## Checklist

- [ ] One branch per task (`feat/<slug>`), and this pull request goes into `main`. Nothing was pushed to `main` directly.
- [ ] **Contract first.** If the report changed, `apps/api/src/datacorn/domain/report.py`, `apps/web/src/domain/report.ts` and `docs/contrato-api.md` changed together, engine first. Not touched: ☐
- [ ] **Tests green.** API: `cd apps/api && uv run --extra dev ruff check src tests && uv run --extra dev pytest -q`. Web: `cd apps/web && npm run build && npm test`. If you touched the map or the flow, also `npx playwright test --workers=1` after the build.
- [ ] Missing data is `null` or `not-available`, never 0. Results are scenarios, not forecasts.
- [ ] Files written with SI assistance start with `SI-assisted (Claude Code); reviewed by <name>`.
- [ ] Every new source (data, library, font, image, paper) has a row in `docs/REFERENCES.md` in this pull request.
- [ ] No secrets, raw downloads or personal data are committed. No NASA logos or insignia. No login.

## How you checked it

<!-- The commands you ran and what they printed, or a screenshot of the screen. -->
