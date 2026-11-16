<!-- SI-assisted (Claude Code); reviewed by <name> -->
# Field Shift

**Decision support for corn producers: which rotation to run, when to plant, and at which growth stage water runs short.**

Built by Team DataCorn for the NASA Space Apps Challenge 2026: [Field Shift: Adapting Farms with NASA Data](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/) (Trujillo local event).

**Try it live (provisional):** [field-shift-datacorn.vercel.app](https://field-shift-datacorn.vercel.app/?mock=1). No API runs behind this link. "See an example" opens a rainfed corn field in Hamilton County, Nebraska, with real engine results computed in advance. Changing the irrigation option keeps a real report. Change another value, or draw another field, and it switches to sample numbers, tagged "Sample data (no API)" on the results and in the PDF.

> **Scenarios from historical climate, not forecasts.** The tool supports a producer's judgment and local agronomic advice. It does not replace them.

The tool works like "Google Earth for corn":

- Start on a 3D globe with NASA climate layers: soil moisture, rain, heat and vegetation, on a time slider.
- Fly to your location, tap the corners of your field and enter a few field facts.
- Get one simple screen that both the farm manager and the agronomist can read:
  - an animated **season film** over the map (soil water day by day);
  - a **verdict** for the season, with the El Niño / La Niña phase when there is one;
  - **Three ways to rotate**: corn after corn, corn and soybean taking turns, and corn and soybean with a rye cover crop, each with the evidence, what we don't know and the risks to check locally;
  - **25-season climate stripes** for that field, with El Niño / La Niña years marked;
  - six key cards: planting date (or field progress), water at silking, heat at silking, hybrid and frost, irrigation (or waterlogging for a rainfed field) and the field's crop history.
- The full report downloads as a PDF.

The first region is the United States (demo state: Nebraska). New countries (Peru, Brazil,
Argentina, …) are added with a region profile, without changing the domain or the screen.

## The idea in one paragraph

Field Shift runs a soil-water model (FAO-56) for one field over 25 seasons of daily NASA POWER climate and USDA SSURGO soil. A season scenario is the observed days so far plus each historical year for the rest of the season, grouped by El Niño phase. From it the tool shows when corn can be planted, where water and heat run short at silking, whether an irrigation system keeps up in the peak week, and a verdict for the season. It explains three rotation strategies, and marks the one that matches the field's last four years in the crop map, if any. The model does not carry water between crops, and the tool says so. The example field is rainfed corn in Hamilton County, Nebraska. Reports for a field in Thomas County, Kansas, and one in Story County, Iowa, are computed too, but no screen opens them yet.

## The problem

Corn producers in western Kansas irrigate from the Ogallala aquifer, which is declining in the southern High Plains. Dry and wet seasons differ a lot, and in April nobody knows which kind of season is coming. Public tools each cover one piece (planting dates, current soil moisture, water already used, cover-crop choice). Decision tools for US corn already exist; the project page compares two of them, DAWN and Agroptimizer, with this one ([docs/submission/PROJECT-PAGE.md](docs/submission/PROJECT-PAGE.md)). Field Shift replays 25 observed past seasons on the soil of one drawn field, and explains three rotation strategies with what is not known about each. Details, sources and the limits of what we claim: [docs/planning/PROBLEM.md](docs/planning/PROBLEM.md). It was written before the build; its status note at the top lists where the app differs.

## What the tool shows

The app has five steps:

1. **Globe**: NASA climate layers on a time slider. Fly to a place, or tap "See an example".
2. **Field**: tap the corners of the field on the map.
3. **Analysis**: the engine gathers 25 years of weather, soil, past crops and satellite data for that place. Without the API, the example loads its saved result instead, and a drawn field gets sample data.
4. **Details**: season, planting date, hybrid relative maturity, irrigation, tillage and yield goal, prefilled with typical values for the area.
5. **Results**, top to bottom:
   - the **season film** and the **verdict**: risk level, confidence, the recommendation and the El Niño / La Niña phase;
   - **Three ways to rotate**: corn after corn, corn and soybean taking turns, and corn and soybean with a cereal rye cover crop. When the field's last four years in the crop map (USDA CDL) are all corn, or corn and soybean taking turns, that strategy is tagged "What this field does now"; the example field matches neither, so none is tagged. Each card gives why it is here, the evidence with its source, the benefits, what we don't know and the risks to check locally. The panel says that the model does not carry water between crops;
   - **25-season climate stripes** for the field;
   - **six key cards**: planting date (or field progress during a season; the example's 2027 season has not started, so it shows the planting date), water at silking, heat at silking, hybrid and frost, irrigation (or waterlogging for a rainfed field), and rotation with the field's crop history;
   - a **PDF** of the report, the disclaimer and the list of sources.

A card with missing data says "No data" instead of a number. One gap is open: where the soil survey has no soil or slope for a spot, the engine still uses generic values and does not flag them yet ([#104](https://github.com/RikepilB/Data_corn/issues/104)). Units are inches, °F and acres by default. The language follows the browser: Spanish for a Spanish browser, English otherwise. The top bar switches units and language, and its Display menu sets text size, contrast and a calm mode with no autoplay. No login, no accounts. Add `?mock=1` to the address to run without the API: the example uses its saved real reports, and anything else uses sample data. The live link already has it.

## How the repository fits together

This repository joins two pieces of work into one codebase, laid out as the Data Corn app (decision of 2026-11-14: its layout is the trunk).

- **`apps/api/`** is the engine and the HTTP service: Python 3.12 and FastAPI in Clean Architecture (domain, application, infrastructure, interfaces), with a test that enforces the dependency rule. The science is in `apps/api/src/datacorn/domain/agronomy/`: FAO-56 reference evapotranspiration, the daily soil-water balance, season scenarios, the planting window and risks, the rotation comparison, El Niño / La Niña grouping, vegetation and in-field zones, and a relative erosion index that no screen shows yet ([#94](https://github.com/RikepilB/Data_corn/issues/94)). The data clients are in `apps/api/src/datacorn/infrastructure/`: NASA POWER, USDA SSURGO and CDL, SoilGrids, NOAA ONI, NASA MODIS through ORNL DAAC, and the Earth Engine adapters (off by default). The routes, under `/api/v1`, are `POST /fields/describe`, `POST /fields/analyze`, `GET /regions`, `GET /demo-fields`, `GET /layers/drought/tiles` and `GET /health`. A command, `python -m datacorn.interfaces.cli.precompute --out ../web/public/data/reports` (run in `apps/api/`), calls the same use cases for the demo fields and writes the reports the static site serves.
- **`apps/web/`** is the single web app: Astro, React and MapLibre. It calls the API. With `?mock=1` it runs without one: the example reads its saved real reports from `apps/web/public/data/reports/`, and anything no saved report matches gets sample data from `apps/web/src/application/mock.ts`. It converts units and renders what comes back; the science stays in the engine.
- **The contract** between the two is the report: `apps/api/src/datacorn/domain/report.py`, `apps/web/src/domain/report.ts` and the written contract, [docs/app/arquitectura-y-api.md](docs/app/arquitectura-y-api.md) (Spanish). A change goes into all three, engine first.
- **`infra/` and `firebase.json`** hold the deployment notes and the Firebase Hosting config. Nothing is deployed there. The provisional live demo is a static build of `apps/web/` on Vercel with no API (see Status).

Each part has its own guide: this README for Field Shift as a whole, and [apps/README.md](apps/README.md) for the Data Corn app (its original README, with the links and its status brought up to date).

## Status

Hackathon build in progress. Submission closes Sun 2026-11-15 23:59 PET (internal target 20:00 PET). State on 2026-11-15, checked on `main` at `1c196f7`:

| Piece | State |
|---|---|
| Live demo | **Provisional:** [field-shift-datacorn.vercel.app](https://field-shift-datacorn.vercel.app/?mock=1), a static build of `apps/web/` on Vercel, with no API behind it. It serves the web app of `main` at `7ef6554` (checked on 2026-11-15). "See an example" shows real reports computed in advance for a rainfed corn field in Hamilton County, Nebraska, one for each irrigation option. Another changed value, or another field, shows sample numbers tagged "Sample data (no API)". The site is not wired to GitHub: it is redeployed by hand, so it can lag behind `main`. The bare link redirects to `?mock=1`; that redirect is a Vercel setting, not a file in this repository. Firebase project `field-shift-datacorn` exists (Spark plan, no Auth, no Firestore), but nothing is deployed there and `field-shift-datacorn.web.app` answers 404; [#52](https://github.com/RikepilB/Data_corn/issues/52) is closed. |
| Engine (`apps/api/`) | Works end to end with no accounts or keys. A run against the real services (NASA POWER, USDA SSURGO and CDL, NOAA ONI) on 2026-11-15 answered `describe` in 16 s and `analyze` in under a second. The saved demo reports were computed with the same use cases on 2026-11-15 at 13:12 PET, engine commit `9905448` (both recorded in `apps/web/public/data/reports/index.json`). 180 tests pass and `ruff` is clean. The Earth Engine adapters are written and tested with a fake session; **they have never run against Earth Engine** and stay off unless `DATACORN_EARTH_ENGINE_ENABLED=true`. Seven stubs remain (`NotImplementedError` in four files: administrative boundaries and SoilGrids through Earth Engine, ECOSTRESS, and Peru's ICEN); none is used on the no-account path. |
| Web app (`apps/web/`) | The five-step flow above works against the API, and without it on the saved example reports and on sample data. 76 unit tests pass (Vitest, 12 files). Playwright has 3 tests in 3 windows (desktop, a phone and 1000 px); it runs by hand, not in CI. CI runs the API's `ruff` and `pytest`, and the web build, type check and unit tests, on every pull request and every push to `main`. English and Spanish text. |
| Contract | The report: `report.py`, `report.ts` and [docs/app/arquitectura-y-api.md](docs/app/arquitectura-y-api.md). There is no JSON Schema file in the repository. |
| Results | No API is deployed. Instead, the precompute command saved real reports for three demo fields: Hamilton County NE, Thomas County KS and Story County IA ([#98](https://github.com/RikepilB/Data_corn/pull/98)). Each file holds the rainfed report and one real report for each irrigation option, used while the capacity box is empty ([#108](https://github.com/RikepilB/Data_corn/pull/108)). The web opens only the Nebraska field, through "See an example"; no screen opens the Kansas and Iowa reports yet. Still open in [#53](https://github.com/RikepilB/Data_corn/issues/53): the check in a private window on a phone outside the team network. |

### Progress by epic

<!-- outline:progress:start -->
**41 of 63 tasks are closed.** Must: 25 of 43. Epics close when all their tasks do.

| Epic | Closed | Still open |
|---|---|---|
| [EPIC 1 · Team, repo and access setup](https://github.com/RikepilB/Data_corn/issues/1) | 4 of 5 | [#12](https://github.com/RikepilB/Data_corn/issues/12) |
| [EPIC 2 · Data sources: investigate, register, verify](https://github.com/RikepilB/Data_corn/issues/2) | 5 of 6 | [#16](https://github.com/RikepilB/Data_corn/issues/16) |
| [EPIC 3 · Papers and scientific basis](https://github.com/RikepilB/Data_corn/issues/3) | 3 of 5 | [#22](https://github.com/RikepilB/Data_corn/issues/22) [#23](https://github.com/RikepilB/Data_corn/issues/23) |
| [EPIC 4 · Validate the idea](https://github.com/RikepilB/Data_corn/issues/4) | 2 of 5 | [#29](https://github.com/RikepilB/Data_corn/issues/29) [#30](https://github.com/RikepilB/Data_corn/issues/30) [#31](https://github.com/RikepilB/Data_corn/issues/31) |
| [EPIC 5 · Clean Architecture and engineering foundation](https://github.com/RikepilB/Data_corn/issues/5) | 3 of 3 | none |
| [EPIC 6 · API engine: adapters → domain → use cases (Python)](https://github.com/RikepilB/Data_corn/issues/6) | 13 of 15 | [#94](https://github.com/RikepilB/Data_corn/issues/94) [#104](https://github.com/RikepilB/Data_corn/issues/104) |
| [EPIC 7 · Web (Astro) and hosting](https://github.com/RikepilB/Data_corn/issues/7) | 6 of 8 | [#53](https://github.com/RikepilB/Data_corn/issues/53) [#107](https://github.com/RikepilB/Data_corn/issues/107) |
| [EPIC 8 · UI/UX and brand](https://github.com/RikepilB/Data_corn/issues/8) | 2 of 6 | [#54](https://github.com/RikepilB/Data_corn/issues/54) [#55](https://github.com/RikepilB/Data_corn/issues/55) [#58](https://github.com/RikepilB/Data_corn/issues/58) [#110](https://github.com/RikepilB/Data_corn/issues/110) |
| [EPIC 9 · Storytelling and demo](https://github.com/RikepilB/Data_corn/issues/9) | 3 of 5 | [#61](https://github.com/RikepilB/Data_corn/issues/61) [#62](https://github.com/RikepilB/Data_corn/issues/62) |
| [EPIC 10 · Submission and compliance](https://github.com/RikepilB/Data_corn/issues/10) | 0 of 5 | [#64](https://github.com/RikepilB/Data_corn/issues/64) [#65](https://github.com/RikepilB/Data_corn/issues/65) [#66](https://github.com/RikepilB/Data_corn/issues/66) [#67](https://github.com/RikepilB/Data_corn/issues/67) [#68](https://github.com/RikepilB/Data_corn/issues/68) |
<!-- outline:progress:end -->

### What is next

<!-- outline:next:start -->
| Milestone | Closed | Open Must tasks |
|---|---|---|
| M0 · Setup (Sat 14:30 PET) | 6 of 7 | [#12](https://github.com/RikepilB/Data_corn/issues/12) |
| M1 · Checkpoint 1 (Sat 17:00 PET) | 12 of 18 | [#16](https://github.com/RikepilB/Data_corn/issues/16) [#22](https://github.com/RikepilB/Data_corn/issues/22) [#23](https://github.com/RikepilB/Data_corn/issues/23) [#54](https://github.com/RikepilB/Data_corn/issues/54) [#55](https://github.com/RikepilB/Data_corn/issues/55) [#61](https://github.com/RikepilB/Data_corn/issues/61) |
| M2 · Checkpoint 2 (Sat 21:00 PET) | 10 of 14 | [#29](https://github.com/RikepilB/Data_corn/issues/29) [#30](https://github.com/RikepilB/Data_corn/issues/30) [#53](https://github.com/RikepilB/Data_corn/issues/53) [#64](https://github.com/RikepilB/Data_corn/issues/64) |
| M3 · Checkpoint 3 (Sun 09:00 PET) | 11 of 12 | [#31](https://github.com/RikepilB/Data_corn/issues/31) |
| M4 · Feature freeze (Sun 14:00 PET) | 1 of 4 | [#58](https://github.com/RikepilB/Data_corn/issues/58) [#62](https://github.com/RikepilB/Data_corn/issues/62) [#66](https://github.com/RikepilB/Data_corn/issues/66) |
| M5 · Submit (Sun 20:00 PET) | 0 of 3 | [#65](https://github.com/RikepilB/Data_corn/issues/65) [#67](https://github.com/RikepilB/Data_corn/issues/67) [#68](https://github.com/RikepilB/Data_corn/issues/68) |
<!-- outline:next:end -->

The Should and Could tasks, and every task's title, are in the outline under [Backlog and milestones](#backlog-and-milestones). What is left, in order of priority, is under [Pending tasks](#pending-tasks).

## Tech stack and architecture

| Layer | Choice |
|---|---|
| Engine | `apps/api/`: Python 3.12, FastAPI, pydantic, numpy, scipy, httpx, pytest, ruff. The Earth Engine client is an optional source, off by default |
| Contract | The report types in `report.py` and `report.ts`, written up in `docs/app/arquitectura-y-api.md` |
| Web | `apps/web/`: Astro 7, React 19, TypeScript 6, MapLibre GL JS, `@react-pdf/renderer` for the PDF; Vitest and Playwright for the tests |
| API hosting (stretch) | Cloud Run with Google Earth Engine; needs a billing-enabled Google Cloud project. Not deployed |
| Web hosting | Provisional on Vercel: a static build with no API. "See an example" opens real reports computed in advance; other fields and values show sample numbers. Firebase Hosting (free Spark plan) is set up in `firebase.json`, but nothing is deployed there. No Auth, no database |

**Clean Architecture, contract-first.**

- `apps/api/src/datacorn/domain/` is pure science (FAO-56 water balance, season scenarios, planting window, rotation comparison). It does no I/O and imports nothing from `application/`, `infrastructure/` or `interfaces/`; its types are frozen dataclasses.
- `apps/api/src/datacorn/infrastructure/` holds all I/O: POWER, SSURGO, CDL, SoilGrids, ONI, MODIS through ORNL DAAC, the cache, and the Earth Engine adapters. There is no AppEEARS loader: it was dropped for the submission ([#44](https://github.com/RikepilB/Data_corn/issues/44), closed as not planned).
- `apps/api/src/datacorn/application/` holds the ports and the use cases that orchestrate the two; `bootstrap.py` is the only place where the layers are wired. A test (`apps/api/tests/unit/test_architecture.py`) enforces the dependency rule.
- The engine returns **one report per analysis** (JSON, SI units). The web renders it and converts SI units to US units for display; it does not compute science.
- Every API and unit test runs without network access, from fakes and recorded fixtures. The end-to-end tests need the network only for the map tiles.

Design decisions and the system diagram: [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) (written before the move to `apps/api/`; read its `pipeline/` as `apps/api/`, see the map in [docs/planning/README.md](docs/planning/README.md) section 6).

```text
NASA POWER daily + USDA SSURGO soil + CDL + NOAA ONI + MODIS NDVI   (optional, off by default: Earth Engine)
        |
        v   apps/api/  (Python, FastAPI, every download cached)
  infrastructure  ->  domain (FAO-56 twin, scenarios, rotation)  ->  application (describe_field, analyze_field)
        |
        v   POST /api/v1/fields/analyze
  one report JSON (SI units): the contract in report.py and report.ts
        |
        v
  apps/web/ (Astro + React + MapLibre)  ->  Vercel (provisional, no API: precomputed example reports, sample data otherwise)
```

## Quickstart

Run the commands from the repository root. You need Node 22.23.4 or later and Python 3.12.

Web app:

```bash
cd apps/web && npm install && npm run dev
```

The dev server listens on http://localhost:4321 and proxies `/api` to `localhost:8080`. `npm run build` type-checks and builds to `apps/web/dist`.

Engine and API, no keys needed:

```bash
cd apps/api && uv run uvicorn datacorn.main:app --port 8080
```

Open `http://localhost:4321/?mock=1` to run without the API: "See an example" shows the real reports computed in advance for the Nebraska example field, one for each irrigation option, and any other field or changed value shows sample numbers tagged "Sample data (no API)". Run the tests with `cd apps/api && uv run --extra dev pytest -q` and `cd apps/web && npm test`. Without [uv](https://docs.astral.sh/uv/): `python -m venv .venv`, activate it, `pip install -e ".[dev]"`, then `uvicorn datacorn.main:app --port 8080` and `pytest`.

## What works today

The whole flow works end to end with real data and **no accounts or keys**:

| Data | Source (no key) |
|---|---|
| Daily weather 2001–today and elevation (root-zone and topsoil wetness are downloaded, but no result uses them yet) | NASA POWER (built on MERRA-2 and CERES; GEOS-IT and FLASHFlux for the latest months) |
| Soil texture, available water, drainage, slope | USDA NRCS SSURGO (Soil Data Access) |
| Crop grown on the field each year | USDA NASS CropScape (Cropland Data Layer) |
| County and state | FCC Census Area API |
| Field NDVI (season progress) | NASA MODIS MOD13Q1 via ORNL DAAC |
| El Niño / La Niña | NOAA CPC ONI |
| Globe layers | NASA GIBS: Blue Marble, SMAP L4, GPM IMERG, MODIS LST, MODIS NDVI |
| Soil outside the US | ISRIC SoilGrids |

The models are the FAO-56 Penman-Monteith reference ET and daily root-zone water balance, FAO-33 yield response, growing degree days, and season scenarios. A scenario is the observed days plus each historical year for the rest of the season, grouped by El Niño phase.

- **Tests (CI on `main` at `1c196f7`, 2026-11-15):** 180 API tests cover the domain math (with the rotation strategies and the erosion index), the use cases end to end with fakes, the Earth Engine adapters with a fake session, the clean-architecture dependency rule, the API, the precompute command, and the scripts `compliance_audit.py` and `probe_sources.py`. The web has 76 unit tests in 12 files, including checks that the shipped example has a real report for each irrigation option. Playwright has 3 tests (two that open the example, one for the place search) in 3 windows (desktop, a phone and 1000 px); it runs by hand.
- **Timing on a field in Sheridan County, Kansas, with a cold cache (2026-11-15):**
  - closing the field (`describe`) took 16 s (an earlier run by the authors took about 9 s);
  - results (`analyze`) took 0.3 s after that;
  - a past or current season adds the MODIS NDVI download, about 1 minute (the authors' figure; we did not time it).

## Pending tasks

In order of priority. Each issue is the source of truth, and its owner closes it.

### Must, before the internal submit (Sun 20:00 PET)

- [ ] Decide the name and the tagline: the app, its PDF and its link preview say "Data Corn", this README says "Field Shift" ([#54](https://github.com/RikepilB/Data_corn/issues/54)).
- [ ] Demo: a video of 30 s or less, or at most 7 slides counting the title and intro slides, in English. A video in another language needs English subtitles. Over either limit, the project is out of Global Judging ([#61](https://github.com/RikepilB/Data_corn/issues/61), [#62](https://github.com/RikepilB/Data_corn/issues/62)).
- [ ] Phone checks: the live link in a private window on a phone outside the team network ([#53](https://github.com/RikepilB/Data_corn/issues/53)), and a 2-minute test with someone outside the team ([#58](https://github.com/RikepilB/Data_corn/issues/58)).
- [ ] Rubric self-assessment ([#31](https://github.com/RikepilB/Data_corn/issues/31)) and the compliance audit: public links, no login, no NASA logos, no personal data ([#65](https://github.com/RikepilB/Data_corn/issues/65)).
- [ ] SI disclosure everywhere, including reviewer names in the file headers ([#66](https://github.com/RikepilB/Data_corn/issues/66)).
- [ ] Owner checks: eligibility and the team page ([#64](https://github.com/RikepilB/Data_corn/issues/64)), collaborators and branch protection on `main` ([#12](https://github.com/RikepilB/Data_corn/issues/12)).
- [ ] Evidence still to post on its issue: the plausibility read of the demo reports ([#30](https://github.com/RikepilB/Data_corn/issues/30)), the prior-art comparison ([#29](https://github.com/RikepilB/Data_corn/issues/29)), the open items of the data-source register ([#16](https://github.com/RikepilB/Data_corn/issues/16)), the FAO-56 check of `maize.yaml` ([#23](https://github.com/RikepilB/Data_corn/issues/23)), REFERENCES rows for every method the code uses ([#22](https://github.com/RikepilB/Data_corn/issues/22)), and the design tokens and accessibility baseline ([#55](https://github.com/RikepilB/Data_corn/issues/55)).
- [ ] Paste the project page text from [docs/submission/PROJECT-PAGE.md](docs/submission/PROJECT-PAGE.md) ([#63](https://github.com/RikepilB/Data_corn/issues/63), done) into the form, in English, and run Save Progress ([#67](https://github.com/RikepilB/Data_corn/issues/67)). Then submit for judging ([#68](https://github.com/RikepilB/Data_corn/issues/68)); the hard close is Sun 23:59 PET.

### Should: known gaps, after the submission unless there is time

- [ ] Missing soil or slope is filled with generic values and not flagged, while the About panel says "not available" ([#104](https://github.com/RikepilB/Data_corn/issues/104)).
- [ ] The silking-water and planting-window cards say more than the engine computes ([#110](https://github.com/RikepilB/Data_corn/issues/110)).
- [ ] The sample zones name Earth Engine as their source, though Earth Engine has never run ([#107](https://github.com/RikepilB/Data_corn/issues/107)).
- [ ] Show the relative erosion index on the rotation cards ([#94](https://github.com/RikepilB/Data_corn/issues/94)).
- [ ] Open the Kansas and Iowa example reports from a screen; they are computed and shipped, but only the Nebraska field opens today.
- [ ] Review the corn parameters marked `verificar` in `apps/api/src/datacorn/resources/crops/maize.yaml` with an agronomist, and calibrate them against NASS county yields once the key is available.
- [ ] Shared links with the field in the URL (RF-42).

### Needs accounts

- [ ] A billing-enabled Google Cloud project, to run the API on Cloud Run. The owner's $300 trial is used up, so a teammate who never had one would claim it ([docs/setup/ACCOUNTS.md](docs/setup/ACCOUNTS.md)). The web already runs on Vercel. See [infra/README.md](infra/README.md) (Spanish).
- [ ] Register the project for Earth Engine. That unlocks the in-field zones (Sentinel-2), field NDVI at 30 m (HLS), the drought layer, and PRISM, SMAP and OpenET. The adapters in `apps/api/src/datacorn/infrastructure/earthengine/` are written and unit-tested without network, but **they have not been run against Earth Engine yet**. Turn them on with `DATACORN_EARTH_ENGINE_ENABLED=true`; while it is off, or if Earth Engine fails, each one is skipped and the no-account source answers.
- [ ] USDA NASS QuickStats API key (`DATACORN_NASS_API_KEY`) for county corn yields. The adapter is already written.
- [ ] ECOSTRESS evapotranspiration through AppEEARS. An Earthdata login works: the first AppEEARS point sample came back on 2026-11-15 ([#18](https://github.com/RikepilB/Data_corn/issues/18)). The adapter, `apps/api/src/datacorn/infrastructure/ecostress.py`, is still a stub.

### Later: more countries

- [ ] Peru: ICEN (coastal El Niño), MapBiomas Peru, MIDAGRI
- [ ] Brazil: MapBiomas Brazil, CONAB / IBGE
- [ ] Argentina: MapBiomas Argentina, MAGyP

## Deploy and local configuration

Deploy the web app to Firebase Hosting (not used today: the live site runs on Vercel, see below):

```bash
cd apps/web && npm run build && cd ../.. && npx firebase-tools deploy --only hosting --project field-shift-datacorn
```

Only the project owner runs it. Nothing is deployed on Firebase Hosting (`field-shift-datacorn.web.app` answers 404). `firebase.json` also rewrites `/api/**` to a Cloud Run service named `datacorn-api`, which is not deployed; a static-only deploy there would go without that rewrite. There is no Vercel configuration in this repository: the live site is a static build of `apps/web/` deployed by hand, and the redirect from `/` to `/?mock=1` is a setting of the Vercel project, to keep on every redeploy.

### Local configuration

Credentials never go in the repository.

- **NASA Earthdata** (optional): only for the AppEEARS point sample, which was requested by hand on the AppEEARS web page ([#18](https://github.com/RikepilB/Data_corn/issues/18)). The app needs no Earthdata login; no working code calls AppEEARS or `earthaccess` (the ECOSTRESS adapter is a stub). To use `earthaccess`, each person logs in once with their own account; the command below stores the login in `~/.netrc`, outside the repo.

  ```bash
  cd apps/api && pip install earthaccess && python -c "import earthaccess; earthaccess.login(persist=True)"
  ```

- **Demo fields**: three example fields (Hamilton County, Nebraska; Thomas County, Kansas; Story County, Iowa) are defined in `apps/api/src/datacorn/resources/demo/fields.json` and served by `GET /api/v1/demo-fields`. To refresh the reports the static site serves, run `cd apps/api && uv run python -m datacorn.interfaces.cli.precompute --out ../web/public/data/reports`. It calls the live data services (no keys) and writes one file per example field, with the rainfed report and one report per irrigation option, plus `index.json`.
- **Firebase**: the project is `field-shift-datacorn`. Run `npx firebase-tools login` once; the owner adds teammates as Editors in the console. Accounts and offers: [docs/setup/ACCOUNTS.md](docs/setup/ACCOUNTS.md).
- **Google Cloud** (only for the stretch-goal live service): see [infra/README.md](infra/README.md) (Spanish).

**Network note (one Windows machine):** Git-Bash `curl` fails TLS against `power.larc.nasa.gov` and `spaceappschallenge.org`. Python, PowerShell and `curl.exe` work. Python requests also hit occasional `WinError 10054` resets, so the adapters retry and cache.

## Repository layout

| Path | What lives there |
|---|---|
| `apps/web/` | Astro + React web app, the single front end: globe, field drawing, season film, stripes, cards, rotation panel, PDF. `public/data/reports/` holds the reports computed in advance for the three example fields; `src/application/mock.ts` makes the sample numbers. |
| `apps/api/` | The engine: Python 3.12, clean architecture. `domain/agronomy/` is the science, `infrastructure/` the data clients and cache, `application/` the ports and use cases, `interfaces/http/` the live service and `interfaces/cli/precompute.py` the command that writes the web's precomputed reports. `resources/` holds the YAML region and crop profiles and the example fields. |
| `infra/` | Deployment notes for Cloud Run and Firebase Hosting (Spanish). Cloud Run is the stretch goal. |
| `scripts/` | `sync_readme_outline.py` keeps the backlog in this README in step with the GitHub issues. `compliance_audit.py` checks the submission rules before the deadline. `probe_sources.py` calls each data source live and prints what came back. |
| `data/raw/` | Downloaded source data (gitignored). |
| `docs/` | Planning documents (English), architecture, data sources, the submission checklist and the project page text, references, the story outline, and the Data Corn working documents (Spanish). |
| `firebase.json` | Firebase Hosting of `apps/web/dist`. No Auth, no database: judges must never hit a login. |

## Data sources

| Source | Role | Priority | Account | In the app today |
|---|---|---|---|---|
| NASA POWER daily (8 parameters, incl. `GWETROOT`, `GWETTOP`) | Climate forcing and ET0 for the season scenarios. The planting window is simulated from this forcing. The soil wetness (`GWETROOT`, `GWETTOP`) is requested, but no result uses it yet; soil temperature (`TSOIL1`) is not requested | Must | None | Yes |
| USDA NRCS SSURGO via Soil Data Access | Soil water-holding capacity | Must | None | Yes |
| USDA NASS Crop Sequence Boundaries / CDL | Crop grown on the field each year (the last 10 CDL years at most), which marks the current rotation strategy when the last four years match one. The Crop Sequence Boundaries were never read ([#19](https://github.com/RikepilB/Data_corn/issues/19)) | Must | None | Yes, the CDL through CropScape |
| SMAP `SPL3SMP_E.006` via AppEEARS | Consistency check of simulated soil moisture | Should | Earthdata Login | No. The loader was dropped for the submission ([#44](https://github.com/RikepilB/Data_corn/issues/44), not planned). A first AppEEARS point sample came back on 2026-11-15, but no code reads it and no check was run. SMAP L4 through Earth Engine is written, never run |
| MODIS `MOD13Q1.061` via AppEEARS | NDVI crop calendar and bare windows | Should | Earthdata Login | MODIS NDVI through ORNL DAAC, no account, for the green-up of the current season. The harvest and bare-soil windows were dropped for the submission ([#45](https://github.com/RikepilB/Data_corn/issues/45), not planned) |
| SRTM `SRTMGL1_NC.003` via AppEEARS | Slope for the relative erosion index | Should | Earthdata Login | No: terrain comes from POWER and SSURGO. The relative erosion index is in the engine (`domain/agronomy/erosion.py`, [#46](https://github.com/RikepilB/Data_corn/issues/46)), but no report uses it yet ([#94](https://github.com/RikepilB/Data_corn/issues/94)) |
| GRACE / GRACE-FO | Regional water-storage context (about 300 km, not one field) | Should | Earthdata Login | No: dropped for the submission ([#47](https://github.com/RikepilB/Data_corn/issues/47), not planned) |
| OpenET | Field evapotranspiration cross-check | Could | API key | Earth Engine adapter written, never run |

Product versions, access, probes, licences and fallbacks for each source: [docs/DATA-SOURCES.md](docs/DATA-SOURCES.md), reconciled with what the app calls and probed live on 2026-11-15 ([#16](https://github.com/RikepilB/Data_corn/issues/16)); `python scripts/probe_sources.py` repeats the probes. Licences and citations: [docs/REFERENCES.md](docs/REFERENCES.md).

The app also uses sources that were not in the plan: the FCC Census Area API, NOAA CPC ONI (El Niño / La Niña), the NASA GIBS globe layers and ISRIC SoilGrids, which are in the table under [What works today](#what-works-today). The browser also loads the EOxCloudless 2024 basemap (modified Copernicus Sentinel-2 data) and searches places with Nominatim (OpenStreetMap), both with no key. A Google satellite basemap is used only when the web build has `PUBLIC_GOOGLE_MAPS_KEY`. The Earth Engine sources (PRISM, ERA5-Land, SMAP L4, HLS, Sentinel-2, OpenET, NASADEM) are written but have never run; [apps/README.md](apps/README.md) lists more.

## Planning documentation

Start at the index: [docs/planning/README.md](docs/planning/README.md).

| Document | What it answers |
|---|---|
| [PROBLEM.md](docs/planning/PROBLEM.md) | Who the user is, the decision, why it is hard, what we do not claim, prior art |
| [REQUIREMENTS.md](docs/planning/REQUIREMENTS.md) | What the product must do, how we will know, and which issue delivers it |
| [MVP.md](docs/planning/MVP.md) | What a judge or farmer sees, scope cut lines, success gates, timeline, risks |
| [UI-UX-DESIGN.md](docs/planning/UI-UX-DESIGN.md) | Audience, principles, page flow, states, tokens, accessibility, voice |
| [DATA-SOURCES.md](docs/DATA-SOURCES.md) | Every data source, API and account |
| [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) | Stack evaluation, system design, science notes |
| [SUBMISSION-COMPLIANCE.md](docs/submission/SUBMISSION-COMPLIANCE.md) | Verified rules and the pre-submit checklist |
| [PROJECT-PAGE.md](docs/submission/PROJECT-PAGE.md) | The project page text for the submission form, in English |
| [STORY.md](docs/story/STORY.md) | The story outline and the comic panels for the demo |
| [Team action plan](docs/TEAM-ACTION-PLAN.es.md) (Spanish) | Roles, timeline, mentor questions, brand |
| [Prior-art research](docs/research/ANTECEDENTES-maiz-EEUU.es.md) (Spanish) | Existing corn tools and the pivot rationale |

**Path note.** The planning documents were written before the layout moved to the Data Corn app. Where they say `web/`, read `apps/web/`; where they say `pipeline/src/fieldshift/`, read `apps/api/src/datacorn/`. Some of them still describe the dry / normal / wet matrix, which was cut on 2026-11-14. The rotation is now three explained strategies ([#42](https://github.com/RikepilB/Data_corn/issues/42)), and past seasons are grouped by El Niño / La Niña phase, not by dry, normal and wet years ([#41](https://github.com/RikepilB/Data_corn/issues/41)). Where they say "ficha" or `contracts/ficha.schema.json`, read the report in `report.py` and `report.ts`: there is no `contracts/` folder. Where they put the site on Firebase Hosting, read the provisional Vercel demo: nothing is deployed on Firebase. The full map is in [docs/planning/README.md](docs/planning/README.md) section 6.

Team plan page (visual version of the Spanish team plan): https://claude.ai/artifact/D3nj2FonudnMYTzJB8JrZA <!-- TODO(owner): set sharing to anyone-with-the-link before submission -->

## Data Corn skeleton documents

Spanish working documents from the skeleton: [arquitectura](docs/app/arquitectura-y-api.md), [flujo](docs/app/flujo-y-pantalla.md), [pantalla](docs/app/flujo-y-pantalla.md), [requerimientos](docs/app/requerimientos.md) and [solucion-tecnica](docs/archive/solucion-tecnica.md), plus [infra/README.md](infra/README.md) for the Google Cloud steps. [arquitectura](docs/app/arquitectura-y-api.md) draws the planned deployment (Firebase Hosting, Cloud Run, Earth Engine); none of it is deployed. The skeleton also keeps two copies of official texts, mostly in English and downloaded on 2026-11-14: the challenge, [reto-field-shift](docs/challenge/field-shift-challenge.md), and the Space Apps 2026 guides, [guias-space-apps-2026](docs/challenge/space-apps-guides.md).

[solucion-tecnica.md](docs/archive/solucion-tecnica.md) still describes an earlier design for Andean sites. The skeleton's scenario axis is El Niño / La Niña, and the app uses it: past seasons are grouped by El Niño / La Niña phase, and the verdict shows the current phase ([#41](https://github.com/RikepilB/Data_corn/issues/41)). The dry, normal and wet year types of decision D7 in [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) were cut with the matrix ([#42](https://github.com/RikepilB/Data_corn/issues/42)).

## Contributing

1. **One branch per task**, named `feat/<slug>`, and a pull request into `main`. Never push to `main` directly. The pull request template, [.github/pull_request_template.md](.github/pull_request_template.md), carries the same checklist.
2. **Tests green before merge**: `cd apps/web && npm run build && npm run typecheck && npm test`, and for the engine `cd apps/api && uv run --extra dev ruff check src tests && uv run --extra dev pytest -q`. GitHub Actions runs the same checks on every pull request and on each push to `main` ([.github/workflows/ci.yml](.github/workflows/ci.yml)). It does not run Playwright: if you touch the map or the flow, also run `npm run test:e2e` after the build (`npx playwright test --workers=1` is the reliable setting on a busy machine).
3. **Contract first**: the contract is the report. Change `report.py`, `report.ts` and `docs/app/arquitectura-y-api.md` together, engine first.
4. **Tests first**: each task starts with failing tests.
5. **SI-assisted files** start with the header `SI-assisted (<tool>); reviewed by <name>`, for example `SI-assisted (Claude Code); reviewed by <name>`. Only the person who reviewed the file replaces `<name>`.
6. **Cite every new source** (data, library, font, image, paper) with a row in `docs/REFERENCES.md` in the same commit.
7. **Missing data is `NaN`, `null` or `not-available`, never 0.** One known exception is open: [#104](https://github.com/RikepilB/Data_corn/issues/104). Results are scenarios, never forecasts.
8. **No secrets, raw downloads or personal data** in the repo (see `.gitignore`). No NASA logos or insignia. No login.

The full rules, with acceptance criteria, are in [REQUIREMENTS.md](docs/planning/REQUIREMENTS.md).

## Backlog and milestones

All work is tracked in [GitHub issues](https://github.com/RikepilB/Data_corn/issues): ten epics and 63 tasks, the 58 planned ones plus five follow-ups opened on 2026-11-15 ([#94](https://github.com/RikepilB/Data_corn/issues/94), [#100](https://github.com/RikepilB/Data_corn/issues/100), [#104](https://github.com/RikepilB/Data_corn/issues/104), [#107](https://github.com/RikepilB/Data_corn/issues/107), [#110](https://github.com/RikepilB/Data_corn/issues/110)), which sit under their epics without a milestone. Milestones M0 to M5 are the team checkpoints ([milestones](https://github.com/RikepilB/Data_corn/milestones)).

**Outline of epics and issues.** Each epic is followed by its tasks, with the cut line (Must, Should or Could) and the milestone. GitHub does not sync checkboxes in Markdown files, so run `python scripts/sync_readme_outline.py --apply` (it needs the `gh` CLI) to copy the issue states, titles, cut lines and milestones into the outline and into the two tables under [Status](#status). The issue itself is the source of truth.

- [ ] [#1](https://github.com/RikepilB/Data_corn/issues/1) **EPIC 1 · Team, repo and access setup**
  - [x] [#11](https://github.com/RikepilB/Data_corn/issues/11) Connect the local scaffold to this repo and open the first PR · Must · M0
  - [ ] [#12](https://github.com/RikepilB/Data_corn/issues/12) Add collaborators and protect `main` · Must · M0
  - [x] [#13](https://github.com/RikepilB/Data_corn/issues/13) Every member: local environment passes the tests and the build · Must · M0
  - [x] [#14](https://github.com/RikepilB/Data_corn/issues/14) Firebase: log in, confirm the project, add Editors · Must · M0
  - [x] [#15](https://github.com/RikepilB/Data_corn/issues/15) Optional offers and accounts (only after the Must path is green) · Could · M3
- [ ] [#2](https://github.com/RikepilB/Data_corn/issues/2) **EPIC 2 · Data sources: investigate, register, verify**
  - [ ] [#16](https://github.com/RikepilB/Data_corn/issues/16) Write the data-source register `docs/DATA-SOURCES.md` · Must · M1
  - [x] [#17](https://github.com/RikepilB/Data_corn/issues/17) Earthdata Login for each data person · Should · M0
  - [x] [#18](https://github.com/RikepilB/Data_corn/issues/18) Submit the AppEEARS point request and check the output · Should · M0
  - [x] [#19](https://github.com/RikepilB/Data_corn/issues/19) Pick the pilot field and read its current rotation · Must · M0
  - [x] [#20](https://github.com/RikepilB/Data_corn/issues/20) GRACE/GRACE-FO: verify the product and variable · Should · M3
  - [x] [#21](https://github.com/RikepilB/Data_corn/issues/21) OpenET: decide to use or drop · Could · M3
- [ ] [#3](https://github.com/RikepilB/Data_corn/issues/3) **EPIC 3 · Papers and scientific basis**
  - [ ] [#22](https://github.com/RikepilB/Data_corn/issues/22) Keep docs/REFERENCES.md complete and matching the code · Must · M1
  - [ ] [#23](https://github.com/RikepilB/Data_corn/issues/23) Check maize.yaml and the water balance against the FAO-56 tables · Must · M1
  - [x] [#24](https://github.com/RikepilB/Data_corn/issues/24) Agronomy sources: planting rule, critical stage, rotation benefits · Must · M1
  - [x] [#25](https://github.com/RikepilB/Data_corn/issues/25) Soil, erosion and SMAP method sources · Should · M3
  - [x] [#26](https://github.com/RikepilB/Data_corn/issues/26) Source the Ogallala impact line on the project page · Should · M3
- [ ] [#4](https://github.com/RikepilB/Data_corn/issues/4) **EPIC 4 · Validate the idea**
  - [x] [#27](https://github.com/RikepilB/Data_corn/issues/27) Mentor round 1: state, field, rotations, year types, thresholds (Q1-Q4) · Must · M1
  - [x] [#28](https://github.com/RikepilB/Data_corn/issues/28) Mentor round 2: validation, erosion, uncertainty, judging (Q5-Q10) + Local Lead schedule · Should · M2
  - [ ] [#29](https://github.com/RikepilB/Data_corn/issues/29) Prior art and the differentiation statement · Must · M2
  - [ ] [#30](https://github.com/RikepilB/Data_corn/issues/30) Plausibility check on the precomputed demo reports · Must · M2
  - [ ] [#31](https://github.com/RikepilB/Data_corn/issues/31) Judging-rubric self-assessment (checkpoint 3 and freeze) · Must · M3
- [x] [#5](https://github.com/RikepilB/Data_corn/issues/5) **EPIC 5 · Clean Architecture and engineering foundation**
  - [x] [#32](https://github.com/RikepilB/Data_corn/issues/32) Layering rule written down and enforced by a test · Must · M1
  - [x] [#33](https://github.com/RikepilB/Data_corn/issues/33) Contract-first workflow and PR template · Must · M1
  - [x] [#34](https://github.com/RikepilB/Data_corn/issues/34) GitHub Actions: tests and build on every PR · Should · M2
- [ ] [#6](https://github.com/RikepilB/Data_corn/issues/6) **EPIC 6 · API engine: adapters → domain → use cases (Python)**
  - [x] [#35](https://github.com/RikepilB/Data_corn/issues/35) Task 1 · Contract semantic validator · Must · M1
  - [x] [#36](https://github.com/RikepilB/Data_corn/issues/36) Task 2 · Cached HTTP + NASA POWER adapter · Must · M1
  - [x] [#37](https://github.com/RikepilB/Data_corn/issues/37) Task 3 · FAO-56 reference evapotranspiration · Must · M1
  - [x] [#38](https://github.com/RikepilB/Data_corn/issues/38) Task 4 · SSURGO soil profile -> available water · Must · M2
  - [x] [#39](https://github.com/RikepilB/Data_corn/issues/39) Task 5 · Crop parameters and site config · Must · M2
  - [x] [#40](https://github.com/RikepilB/Data_corn/issues/40) Task 6 · Daily balance per rotation: rainfed and full-irrigation runs (one season exists) · Must · M2
  - [x] [#41](https://github.com/RikepilB/Data_corn/issues/41) Task 7 · Dry / normal / wet summary of the corn year (Should) · Should · M1
  - [x] [#42](https://github.com/RikepilB/Data_corn/issues/42) Task 8 · Three explained rotation strategies (contract field, engine options, web panel) · Must · M2
  - [x] [#43](https://github.com/RikepilB/Data_corn/issues/43) Task 9 · `build_site_ficha` use case and CLI (first real ficha) · Must · M2
  - [x] [#44](https://github.com/RikepilB/Data_corn/issues/44) Task 10 · AppEEARS loader + SMAP consistency check · Should · M3
  - [x] [#45](https://github.com/RikepilB/Data_corn/issues/45) Task 11 · NDVI harvest and bare-soil windows (green-up exists) · Should · M3
  - [x] [#46](https://github.com/RikepilB/Data_corn/issues/46) Task 12 · Relative erosion index · Should · M3
  - [x] [#47](https://github.com/RikepilB/Data_corn/issues/47) Task 15 · GRACE regional water context · Should · M3
  - [ ] [#94](https://github.com/RikepilB/Data_corn/issues/94) Show the relative erosion index on the rotation cards · Should · follow-up
  - [ ] [#104](https://github.com/RikepilB/Data_corn/issues/104) Missing soil or slope is filled with generic values, but the About panel says "not available" · Should · follow-up
- [ ] [#7](https://github.com/RikepilB/Data_corn/issues/7) **EPIC 7 · Web (Astro) and hosting**
  - [x] [#48](https://github.com/RikepilB/Data_corn/issues/48) Task 13a · Vitest and unit tests for the web helpers (ficha types wait on #7) · Must · M1
  - [x] [#49](https://github.com/RikepilB/Data_corn/issues/49) Task 13b · Tool page: planting strip, matrix, rotation cards · Must · M1
  - [x] [#50](https://github.com/RikepilB/Data_corn/issues/50) Task 13c · Field map (MapLibre island) · Should · M3
  - [x] [#51](https://github.com/RikepilB/Data_corn/issues/51) Task 13d · End-to-end smoke test (Playwright) · Must · M2
  - [x] [#52](https://github.com/RikepilB/Data_corn/issues/52) Task 14a · Deploy v0 (synthetic example) to Firebase Hosting · Must · M1
  - [ ] [#53](https://github.com/RikepilB/Data_corn/issues/53) Task 14b · Serve real results (precomputed reports or API) and check public access · Must · M2
  - [x] [#100](https://github.com/RikepilB/Data_corn/issues/100) Precompute one demo report per irrigation system · Could · follow-up
  - [ ] [#107](https://github.com/RikepilB/Data_corn/issues/107) Sample zones name Earth Engine as their source, though Earth Engine has never run · Should · follow-up
- [ ] [#8](https://github.com/RikepilB/Data_corn/issues/8) **EPIC 8 · UI/UX and brand**
  - [ ] [#54](https://github.com/RikepilB/Data_corn/issues/54) Decide the name and the tagline · Must · M1
  - [ ] [#55](https://github.com/RikepilB/Data_corn/issues/55) Design tokens, fonts and accessibility baseline · Must · M1
  - [x] [#56](https://github.com/RikepilB/Data_corn/issues/56) Mobile-first wireframes for the tool page · Must · M1
  - [x] [#57](https://github.com/RikepilB/Data_corn/issues/57) UX copy in plain English · Must · M2
  - [ ] [#58](https://github.com/RikepilB/Data_corn/issues/58) Outsider usability test on a phone (2 minutes) · Must · M4
  - [ ] [#110](https://github.com/RikepilB/Data_corn/issues/110) The silking-water and planting-window cards say more than the engine computes · Should · follow-up
- [ ] [#9](https://github.com/RikepilB/Data_corn/issues/9) **EPIC 9 · Storytelling and demo**
  - [x] [#59](https://github.com/RikepilB/Data_corn/issues/59) Story outline: the orbital observer · Must · M2
  - [x] [#60](https://github.com/RikepilB/Data_corn/issues/60) Add an About section: how it works, limits, data credits · Must · M3
  - [ ] [#61](https://github.com/RikepilB/Data_corn/issues/61) Decide the demo format: 7 slides or 30-second video · Must · M1
  - [ ] [#62](https://github.com/RikepilB/Data_corn/issues/62) Demo deck (7 slides, public link) · Must · M4
  - [x] [#63](https://github.com/RikepilB/Data_corn/issues/63) Project page text (English) for the submission form · Must · M4
- [ ] [#10](https://github.com/RikepilB/Data_corn/issues/10) **EPIC 10 · Submission and compliance**
  - [ ] [#64](https://github.com/RikepilB/Data_corn/issues/64) Verify eligibility and the team page · Must · M2
  - [ ] [#65](https://github.com/RikepilB/Data_corn/issues/65) Compliance audit: public links, no login, no NASA logos, no personal data · Must · M5
  - [ ] [#66](https://github.com/RikepilB/Data_corn/issues/66) SI (AI) disclosure everywhere · Must · M4
  - [ ] [#67](https://github.com/RikepilB/Data_corn/issues/67) Fill the project form in English and run Save Progress · Must · M5
  - [ ] [#68](https://github.com/RikepilB/Data_corn/issues/68) SUBMIT FOR JUDGING (Sun 20:00 PET) · Must · M5

Milestones (all times PET, UTC-5): M0 Setup, Sat 14:30 · M1 Checkpoint 1, Sat 17:00 · M2 Checkpoint 2, Sat 21:00 · M3 Checkpoint 3, Sun 09:00 · M4 Feature freeze, Sun 14:00 · M5 Submit, Sun 20:00 (hard close 23:59). The full timeline is in [MVP.md](docs/planning/MVP.md).

**Board columns.** On the team's private GitHub Project board, each issue moves left to right through seven columns: Backlog → Ideación (ideation) → Spec → Desarrollo (development) → QA y testeo (QA and testing) → Post testing implementación (rollout after testing) → Done.

## Use of Super Intelligence (SI)

The 2026 rules say "SI" where earlier years said "AI". Team DataCorn used SI as a coding and writing assistant, under the team's direction and with human review.

- **Tools.** Claude Code (Anthropic), credited as co-author in the commits it helped write (Claude Fable 5.2, Opus 5.5, Sonnet 5.5 and Haiku 5.5). Codex (OpenAI) helped write the relative erosion index ([#46](https://github.com/RikepilB/Data_corn/issues/46)), which the app does not use yet ([#94](https://github.com/RikepilB/Data_corn/issues/94)).
- **What SI helped with.** Most of the code in `apps/` and `scripts/`, the tests, the planning documents, the GitHub issues, the summaries of the sources we read, the story outline, the project page draft, and this README. Read every source file and document here as SI-assisted unless its header says otherwise. The header `SI-assisted (<tool>); reviewed by <name>` names a reviewer only after that person has read the file ([#66](https://github.com/RikepilB/Data_corn/issues/66)).
- **What did not come from SI.** The solution idea, the choice of challenge and the design decisions came from Team DataCorn. Every number in a real report is computed by the engine from public data (NASA POWER, SSURGO, CDL, MODIS, NOAA) with the methods cited in [REFERENCES.md](docs/REFERENCES.md); no SI model writes or estimates those values. Without the API, "See an example" shows real reports that the engine computed in advance for a rainfed demo field in Hamilton County, Nebraska (`apps/web/public/data/reports/hamilton-ne.json`), one for each irrigation option. Any other field or changed value shows sample values, tagged "Sample data (no API)", produced by code written with SI assistance (`apps/web/src/application/mock.ts`). They are not results.
- **SI at run time: only the optional chat assistant.** The engine and the API call no SI model. The chat assistant ([#120](https://github.com/RikepilB/Data_corn/issues/120); `apps/web/server/chat/`, `apps/web/api/chat.ts`, `apps/web/src/ui/chat/`) is off unless the build sets `PUBLIC_CHAT_ENABLED=true`, and then shows only on the real example report. It sends the person's question, and one photo or PDF if they attach it, to a language model through OpenRouter (model set by `OPENROUTER_MODEL`). The model reads the report's numbers through fixed lookup tools and computes nothing; it speaks of scenarios, not forecasts. The panel says "SI assistant, it can be wrong." Nothing typed or uploaded is stored or logged, there is no login, and the conversation lives only in the open page.
- **Media.** Besides the favicon, the app's only image file is a link-preview screenshot of the app itself (`apps/web/public/og-image.jpg`), on EOxCloudless and NASA GIBS map tiles. The favicon and the line icons (`apps/web/src/ui/common/Icon.tsx`) are small SVG drawings written as code with SI assistance. Any SI-generated image, video or audio in the demo or the slides carries a visible watermark and is listed here. No NASA logo or insignia appears anywhere.

## Licence

[Apache-2.0](LICENSE). Third-party data, map tiles, fonts and libraries keep their own licences, listed in [docs/REFERENCES.md](docs/REFERENCES.md). The share image `apps/web/public/og-image.jpg` contains EOxCloudless map tiles, which are licensed CC BY-NC-SA 4.0 (non-commercial use only).

Field Shift is a hackathon project. It is not affiliated with or endorsed by NASA or the USDA. NASA and USDA are named only as data sources.
