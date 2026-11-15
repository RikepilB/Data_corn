<!-- SI-assisted (Claude Code); reviewed by <name> -->
# Field Shift

**Decision support for corn producers: which rotation to run, when to plant, and at which growth stage water runs short.**

Built by Team DataCorn for the NASA Space Apps Challenge 2026: [Field Shift: Adapting Farms with NASA Data](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/) (Trujillo local event).

**Try it live (provisional, sample data only):** [field-shift-datacorn.vercel.app](https://field-shift-datacorn.vercel.app/?mock=1). There is no API behind this link, so every number on it is a sample.

> **Scenarios from historical climate, not forecasts.** The tool supports a producer's judgment and local agronomic advice. It does not replace them.

The tool works like "Google Earth for corn":

- Start on a 3D globe with NASA climate layers: soil moisture, rain, heat and vegetation, on a time slider.
- Fly to your location, tap the corners of your field and enter a few field facts.
- Get one simple screen that both the farm manager and the agronomist can read:
  - an animated **season film** over the map (soil water day by day);
  - a **verdict** for the season, with the El Niño / La Niña phase when there is one;
  - **Three ways to rotate**: corn after corn, corn and soybean taking turns, and corn and soybean with a rye cover crop, each with the evidence, what we don't know and the risks to check locally;
  - **25-season climate stripes** for that field, with El Niño / La Niña years marked;
  - key cards: planting date (or field progress), water at silking, heat at silking, hybrid and frost, irrigation, waterlogging and the field's crop history.
- The full report downloads as a PDF.

The first region is the United States (demo state: Nebraska). New countries (Peru, Brazil,
Argentina, …) are added with a region profile, without changing the domain or the screen.

## The idea in one paragraph

Field Shift runs a soil-water model (FAO-56) for one field over 25 seasons of daily NASA POWER climate and USDA SSURGO soil. A season scenario is the observed days so far plus each historical year for the rest of the season, grouped by El Niño phase. From it the tool shows when corn can be planted, where water and heat run short at silking, how much irrigation the season would need, and a verdict for the season. It lays the field's current rotation next to two alternatives as three explained strategies. The model does not carry water between crops, and the tool says so. The proposed pilot area is Sheridan County in western Kansas, over the Ogallala aquifer (to be confirmed with a mentor).

## The problem

Corn producers in western Kansas irrigate from the Ogallala aquifer, which is declining in the southern High Plains. Dry and wet seasons differ a lot, and in April nobody knows which kind of season is coming. Public tools each cover one piece (planting dates, current soil moisture, water already used, cover-crop choice). Our research found no public tool that compares rotations for one field across dry, normal and wet years. That is the gap Field Shift addresses. Details, sources and the limits of what we claim: [docs/planning/PROBLEM.md](docs/planning/PROBLEM.md).

## What the tool shows

The app has five steps, shown as "Step n of 5":

1. **Globe**: NASA climate layers on a time slider. Fly to a place, or tap "See an example".
2. **Field**: tap the corners of the field on the map.
3. **Analysis**: the engine gathers 25 years of weather, soil, past crops and satellite data for that place.
4. **Details**: season, planting date, hybrid relative maturity, irrigation, tillage and yield goal, prefilled with typical values for the area.
5. **Results**, top to bottom:
   - the **season film** and the **verdict**: risk level, confidence, the recommendation and the El Niño / La Niña phase;
   - **Three ways to rotate**: corn after corn, corn and soybean taking turns, and corn and soybean with a cereal rye cover crop. The one that matches the field's crop history (USDA CDL) comes first, tagged "What this field does now". Each card gives why it is here, the evidence with its source, the benefits, what we don't know and the risks to check locally. The panel says that the model does not carry water between crops;
   - **25-season climate stripes** for the field;
   - **key cards**: planting date (or field progress), water at silking, heat at silking, hybrid and frost, irrigation, waterlogging, and rotation with the field's crop history;
   - a **PDF** of the report, the disclaimer and the list of sources.

Missing data is shown as "no data", never as zero. Units are inches, °F and acres by default; the top bar switches to metric and to Spanish. No login, no accounts. Add `?mock=1` to the address to use sample data without the API.

## How the repository fits together

This repository joins two pieces of work into one codebase, laid out as the Data Corn app (decision of 2026-11-14: its layout is the trunk).

- **`apps/api/`** is the engine and the HTTP service: Python 3.12 and FastAPI in Clean Architecture (domain, application, infrastructure, interfaces), with a test that enforces the dependency rule. The science is in `apps/api/src/datacorn/domain/agronomy/`: FAO-56 reference evapotranspiration, the daily soil-water balance, season scenarios, the planting window and risks, the rotation comparison, El Niño / La Niña grouping, vegetation and in-field zones. The data clients are in `apps/api/src/datacorn/infrastructure/`: NASA POWER, USDA SSURGO and CDL, SoilGrids, NOAA ONI, NASA MODIS through ORNL DAAC, and the Earth Engine adapters (off by default). The routes, under `/api/v1`, are `POST /fields/describe`, `POST /fields/analyze`, `GET /regions`, `GET /demo-fields`, `GET /layers/drought/tiles` and `GET /health`.
- **`apps/web/`** is the single web app: Astro, React and MapLibre. It calls the API, or shows sample data with `?mock=1`. It converts units and renders what comes back; the science stays in the engine.
- **The contract** between the two is the report: `apps/api/src/datacorn/domain/report.py`, `apps/web/src/domain/report.ts` and the written contract, [docs/contrato-api.md](docs/contrato-api.md) (Spanish). A change goes into all three, engine first.
- **`infra/` and `firebase.json`** hold the deployment notes and the Firebase Hosting config. Nothing is deployed there yet. The provisional live demo is a static build of `apps/web/` on Vercel with sample data only (see Status).

Each part has its own guide: this README for Field Shift as a whole, and [apps/README.md](apps/README.md) for the Data Corn app (its original README, with only the links adjusted).

## Status

Hackathon build in progress. Submission closes Sun 2026-11-15 23:59 PET (internal target 20:00 PET). State on 2026-11-15, checked on `main`:

| Piece | State |
|---|---|
| Live demo | **Provisional:** [field-shift-datacorn.vercel.app](https://field-shift-datacorn.vercel.app/?mock=1), a static build of `apps/web/` on Vercel with sample data only. It is not wired to GitHub, so it does not follow `main` and can lag behind it. Firebase project `field-shift-datacorn` exists (Spark plan, no Auth, no Firestore), but `field-shift-datacorn.web.app` still answers 404: nothing is deployed there yet ([#52](https://github.com/RikepilB/Data_corn/issues/52)). |
| Engine (`apps/api/`) | Works end to end with no accounts or keys. A run against the real services (NASA POWER, USDA SSURGO and CDL, NOAA ONI) on 2026-11-15 answered `describe` in 16 s and `analyze` in under a second. 63 tests pass and `ruff` is clean. The Earth Engine adapters are written and tested with a fake session; **they have never run against Earth Engine** and stay off unless `DATACORN_EARTH_ENGINE_ENABLED=true`. Seven stubs remain (`NotImplementedError` in four files: administrative boundaries and SoilGrids through Earth Engine, ECOSTRESS, and Peru's ICEN); none is used on the no-account path. |
| Web app (`apps/web/`) | The five-step flow above works against the API and with sample data. 42 unit tests pass, and so does the Playwright smoke test (desktop, phone and a 1000 px window, two cases each, run one worker at a time). English and Spanish text. |
| Contract | The report: `report.py`, `report.ts` and [docs/contrato-api.md](docs/contrato-api.md). There is no JSON Schema file in the repository. |
| Results | Real numbers need the API, and the API is not deployed, so the hosted demo shows sample data. Precomputing reports for 3-4 demo fields, so the hosted demo can show real numbers without a server, is not done ([#53](https://github.com/RikepilB/Data_corn/issues/53)). |

### Progress by epic

<!-- outline:progress:start -->
**12 of 58 tasks are closed.** Must: 11 of 43. Epics close when all their tasks do.

| Epic | Closed | Still open |
|---|---|---|
| [EPIC 1 · Team, repo and access setup](https://github.com/RikepilB/Data_corn/issues/1) | 0 of 5 | [#11](https://github.com/RikepilB/Data_corn/issues/11) [#12](https://github.com/RikepilB/Data_corn/issues/12) [#13](https://github.com/RikepilB/Data_corn/issues/13) [#14](https://github.com/RikepilB/Data_corn/issues/14) [#15](https://github.com/RikepilB/Data_corn/issues/15) |
| [EPIC 2 · Data sources: investigate, register, verify](https://github.com/RikepilB/Data_corn/issues/2) | 0 of 6 | [#16](https://github.com/RikepilB/Data_corn/issues/16) [#17](https://github.com/RikepilB/Data_corn/issues/17) [#18](https://github.com/RikepilB/Data_corn/issues/18) [#19](https://github.com/RikepilB/Data_corn/issues/19) [#20](https://github.com/RikepilB/Data_corn/issues/20) [#21](https://github.com/RikepilB/Data_corn/issues/21) |
| [EPIC 3 · Papers and scientific basis](https://github.com/RikepilB/Data_corn/issues/3) | 0 of 5 | [#22](https://github.com/RikepilB/Data_corn/issues/22) [#23](https://github.com/RikepilB/Data_corn/issues/23) [#24](https://github.com/RikepilB/Data_corn/issues/24) [#25](https://github.com/RikepilB/Data_corn/issues/25) [#26](https://github.com/RikepilB/Data_corn/issues/26) |
| [EPIC 4 · Validate the idea](https://github.com/RikepilB/Data_corn/issues/4) | 0 of 5 | [#27](https://github.com/RikepilB/Data_corn/issues/27) [#28](https://github.com/RikepilB/Data_corn/issues/28) [#29](https://github.com/RikepilB/Data_corn/issues/29) [#30](https://github.com/RikepilB/Data_corn/issues/30) [#31](https://github.com/RikepilB/Data_corn/issues/31) |
| [EPIC 5 · Clean Architecture and engineering foundation](https://github.com/RikepilB/Data_corn/issues/5) | 0 of 3 | [#32](https://github.com/RikepilB/Data_corn/issues/32) [#33](https://github.com/RikepilB/Data_corn/issues/33) [#34](https://github.com/RikepilB/Data_corn/issues/34) |
| [EPIC 6 · Pipeline: adapters → domain → usecases (Python)](https://github.com/RikepilB/Data_corn/issues/6) | 7 of 13 | [#41](https://github.com/RikepilB/Data_corn/issues/41) [#42](https://github.com/RikepilB/Data_corn/issues/42) [#44](https://github.com/RikepilB/Data_corn/issues/44) [#45](https://github.com/RikepilB/Data_corn/issues/45) [#46](https://github.com/RikepilB/Data_corn/issues/46) [#47](https://github.com/RikepilB/Data_corn/issues/47) |
| [EPIC 7 · Web (Astro) and Firebase Hosting](https://github.com/RikepilB/Data_corn/issues/7) | 4 of 6 | [#52](https://github.com/RikepilB/Data_corn/issues/52) [#53](https://github.com/RikepilB/Data_corn/issues/53) |
| [EPIC 8 · UI/UX and brand](https://github.com/RikepilB/Data_corn/issues/8) | 0 of 5 | [#54](https://github.com/RikepilB/Data_corn/issues/54) [#55](https://github.com/RikepilB/Data_corn/issues/55) [#56](https://github.com/RikepilB/Data_corn/issues/56) [#57](https://github.com/RikepilB/Data_corn/issues/57) [#58](https://github.com/RikepilB/Data_corn/issues/58) |
| [EPIC 9 · Storytelling and demo](https://github.com/RikepilB/Data_corn/issues/9) | 1 of 5 | [#60](https://github.com/RikepilB/Data_corn/issues/60) [#61](https://github.com/RikepilB/Data_corn/issues/61) [#62](https://github.com/RikepilB/Data_corn/issues/62) [#63](https://github.com/RikepilB/Data_corn/issues/63) |
| [EPIC 10 · Submission and compliance](https://github.com/RikepilB/Data_corn/issues/10) | 0 of 5 | [#64](https://github.com/RikepilB/Data_corn/issues/64) [#65](https://github.com/RikepilB/Data_corn/issues/65) [#66](https://github.com/RikepilB/Data_corn/issues/66) [#67](https://github.com/RikepilB/Data_corn/issues/67) [#68](https://github.com/RikepilB/Data_corn/issues/68) |
<!-- outline:progress:end -->

### What is next

<!-- outline:next:start -->
| Milestone | Closed | Open Must tasks |
|---|---|---|
| M0 · Setup (Sat 14:30 PET) | 0 of 7 | [#11](https://github.com/RikepilB/Data_corn/issues/11) [#12](https://github.com/RikepilB/Data_corn/issues/12) [#13](https://github.com/RikepilB/Data_corn/issues/13) [#14](https://github.com/RikepilB/Data_corn/issues/14) [#19](https://github.com/RikepilB/Data_corn/issues/19) |
| M1 · Checkpoint 1 (Sat 17:00 PET) | 5 of 18 | [#16](https://github.com/RikepilB/Data_corn/issues/16) [#22](https://github.com/RikepilB/Data_corn/issues/22) [#23](https://github.com/RikepilB/Data_corn/issues/23) [#24](https://github.com/RikepilB/Data_corn/issues/24) [#27](https://github.com/RikepilB/Data_corn/issues/27) [#32](https://github.com/RikepilB/Data_corn/issues/32) [#33](https://github.com/RikepilB/Data_corn/issues/33) [#52](https://github.com/RikepilB/Data_corn/issues/52) [#54](https://github.com/RikepilB/Data_corn/issues/54) [#55](https://github.com/RikepilB/Data_corn/issues/55) [#56](https://github.com/RikepilB/Data_corn/issues/56) [#61](https://github.com/RikepilB/Data_corn/issues/61) |
| M2 · Checkpoint 2 (Sat 21:00 PET) | 6 of 14 | [#29](https://github.com/RikepilB/Data_corn/issues/29) [#30](https://github.com/RikepilB/Data_corn/issues/30) [#42](https://github.com/RikepilB/Data_corn/issues/42) [#53](https://github.com/RikepilB/Data_corn/issues/53) [#57](https://github.com/RikepilB/Data_corn/issues/57) [#64](https://github.com/RikepilB/Data_corn/issues/64) |
| M3 · Checkpoint 3 (Sun 09:00 PET) | 1 of 12 | [#31](https://github.com/RikepilB/Data_corn/issues/31) [#60](https://github.com/RikepilB/Data_corn/issues/60) |
| M4 · Feature freeze (Sun 14:00 PET) | 0 of 4 | [#58](https://github.com/RikepilB/Data_corn/issues/58) [#62](https://github.com/RikepilB/Data_corn/issues/62) [#63](https://github.com/RikepilB/Data_corn/issues/63) [#66](https://github.com/RikepilB/Data_corn/issues/66) |
| M5 · Submit (Sun 20:00 PET) | 0 of 3 | [#65](https://github.com/RikepilB/Data_corn/issues/65) [#67](https://github.com/RikepilB/Data_corn/issues/67) [#68](https://github.com/RikepilB/Data_corn/issues/68) |
<!-- outline:next:end -->

The Should and Could tasks, and every task's title, are in the outline under [Backlog and milestones](#backlog-and-milestones).

## Tech stack and architecture

| Layer | Choice |
|---|---|
| Engine | `apps/api/`: Python 3.12, FastAPI, pydantic, numpy, scipy, httpx, pytest, ruff. The Earth Engine client is an optional source, off by default |
| Contract | The report types in `report.py` and `report.ts`, written up in `docs/contrato-api.md` |
| Web | `apps/web/`: Astro 7, React 19, TypeScript 6, MapLibre GL JS, `@react-pdf/renderer` for the PDF; Vitest and Playwright for the tests |
| API hosting (stretch) | Cloud Run with Google Earth Engine; needs a billing-enabled Google Cloud project. Not deployed |
| Web hosting | Provisional on Vercel (sample data only); Firebase Hosting on the free Spark plan is planned. No Auth, no database |

**Clean Architecture, contract-first.**

- `apps/api/src/datacorn/domain/` is pure science (FAO-56 water balance, season scenarios, planting window, rotation comparison). It does no I/O and imports nothing from `application/`, `infrastructure/` or `interfaces/`; its types are frozen dataclasses.
- `apps/api/src/datacorn/infrastructure/` holds all I/O: POWER, SSURGO, CDL, SoilGrids, ONI, MODIS through ORNL DAAC, the cache, and the Earth Engine adapters. The AppEEARS loader is planned ([#44](https://github.com/RikepilB/Data_corn/issues/44)).
- `apps/api/src/datacorn/application/` holds the ports and the use cases that orchestrate the two; `bootstrap.py` is the only place where the layers are wired. A test (`apps/api/tests/unit/test_architecture.py`) enforces the dependency rule.
- The engine returns **one report per analysis** (JSON, SI units). The web renders it and converts SI units to US units for display; it does not compute science.
- Every API and unit test runs without network access, from fakes and recorded fixtures. The end-to-end test needs the network only for the map tiles.

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
  apps/web/ (Astro + React + MapLibre)  ->  Vercel (provisional, sample data) · Firebase Hosting (planned)
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

Open `http://localhost:4321/?mock=1` to try the screen with sample data and no API. Run the tests with `cd apps/api && uv run --extra dev pytest -q` and `cd apps/web && npm test`. Without [uv](https://docs.astral.sh/uv/): `python -m venv .venv`, activate it, `pip install -e ".[dev]"`, then `uvicorn datacorn.main:app --port 8080` and `pytest`.

## What works today

The whole flow works end to end with real data and **no accounts or keys**:

| Data | Source (no key) |
|---|---|
| Daily weather 2001–today, root-zone soil wetness, elevation | NASA POWER (MERRA-2) |
| Soil texture, available water, drainage, slope | USDA NRCS SSURGO (Soil Data Access) |
| Crop grown on the field each year | USDA NASS CropScape (Cropland Data Layer) |
| County and state | FCC Census Area API |
| Field NDVI (season progress) | NASA MODIS MOD13Q1 via ORNL DAAC |
| El Niño / La Niña | NOAA CPC ONI |
| Globe layers | NASA GIBS: Blue Marble, SMAP L4, GPM IMERG, MODIS LST, MODIS NDVI |
| Soil outside the US | ISRIC SoilGrids |

The models are the FAO-56 Penman-Monteith reference ET and daily root-zone water balance, FAO-33 yield response, growing degree days, and season scenarios. A scenario is the observed days plus each historical year for the rest of the season, grouped by El Niño phase.

- **Tests:** 63 API tests cover the domain math, the use cases end to end with fakes, the Earth Engine adapters with a fake session, the clean-architecture dependency rule and the API. The web has 42 unit tests and a Playwright smoke test (6 runs: desktop, phone and a 1000 px window, two cases each).
- **Timing on a field in Sheridan County, Kansas, with a cold cache (2026-11-15):**
  - closing the field (`describe`) took 16 s (an earlier run by the authors took about 9 s);
  - results (`analyze`) took 0.3 s after that;
  - a past or current season adds the MODIS NDVI download, about 1 minute (the authors' figure; we did not time it).

## Pending tasks

### Needs accounts
- [ ] New Google Cloud project ($300 trial), deployed with Cloud Run (API) and Firebase Hosting (web). See [infra/README.md](infra/README.md).
- [ ] Register the project for Earth Engine. That unlocks the in-field zones (Sentinel-2), field NDVI at 30 m (HLS), the drought layer, and PRISM, SMAP and OpenET. The adapters in `apps/api/src/datacorn/infrastructure/earthengine/` are written and unit-tested without network, but **they have not been run against Earth Engine yet**. Turn them on with `DATACORN_EARTH_ENGINE_ENABLED=true`; while it is off, or if Earth Engine fails, each one is skipped and the no-account source answers.
- [ ] USDA NASS QuickStats API key (`DATACORN_NASS_API_KEY`) for county corn yields. The adapter is already written.
- [ ] Earthdata login for ECOSTRESS (AppEEARS).

### Product
- [ ] Precompute 3–4 demo fields (Nebraska irrigated and rainfed, Iowa, Kansas) so the demo is instant and the hosted demo shows real numbers ([#53](https://github.com/RikepilB/Data_corn/issues/53)).
- [ ] Review the corn parameters marked `verificar` in `apps/api/src/datacorn/resources/crops/maize.yaml` with an agronomist, and calibrate them against NASS county yields once the key is available.
- [ ] Shared links with the field in the URL (RF-42).

### Space Apps submission
- [ ] Demo: video of 30 s or less with English subtitles, or 7 slides or fewer, in English ([#61](https://github.com/RikepilB/Data_corn/issues/61), [#62](https://github.com/RikepilB/Data_corn/issues/62)).
- [ ] Project page in English, every dataset cited, AI use declared ([#63](https://github.com/RikepilB/Data_corn/issues/63)).
- [ ] Submit before Sunday, November 15, 2026, 23:59 local time ([#68](https://github.com/RikepilB/Data_corn/issues/68)).

### Later: more countries
- [ ] Peru: ICEN (coastal El Niño), MapBiomas Peru, MIDAGRI
- [ ] Brazil: MapBiomas Brazil, CONAB / IBGE
- [ ] Argentina: MapBiomas Argentina, MAGyP

## Deploy and local configuration

Deploy the web app:

```bash
cd apps/web && npm run build && cd ../.. && npx firebase-tools deploy --only hosting --project field-shift-datacorn
```

The last command deploys to Firebase Hosting. Only the project owner runs it, and nothing has been deployed yet ([#52](https://github.com/RikepilB/Data_corn/issues/52)). `firebase.json` also rewrites `/api/**` to a Cloud Run service named `datacorn-api`, which is not deployed; the first static deploy is planned without that rewrite. There is no Vercel configuration in this repository.

### Local configuration

Credentials never go in the repository.

- **NASA Earthdata** (SMAP, MODIS, GRACE through AppEEARS and `earthaccess`): each person logs in once with their own account. The login is stored in `~/.netrc`, outside the repo.

  ```bash
  cd apps/api && pip install earthaccess && python -c "import earthaccess; earthaccess.login(persist=True)"
  ```

- **Pilot field and demo fields**: demo fields are defined in `apps/api/src/datacorn/resources/demo/fields.json` and served by `GET /api/v1/demo-fields`; the file is empty today. The pilot area is proposed, not confirmed ([#19](https://github.com/RikepilB/Data_corn/issues/19)). No command precomputes reports for the web yet ([#53](https://github.com/RikepilB/Data_corn/issues/53)).
- **Firebase**: the project is `field-shift-datacorn`. Run `npx firebase-tools login` once; the owner adds teammates as Editors in the console. Accounts and offers: [docs/setup/ACCOUNTS.md](docs/setup/ACCOUNTS.md).
- **Google Cloud** (only for the stretch-goal live service): see [infra/README.md](infra/README.md) (Spanish).

**Network note (one Windows machine):** Git-Bash `curl` fails TLS against `power.larc.nasa.gov` and `spaceappschallenge.org`. Python, PowerShell and `curl.exe` work. Python requests also hit occasional `WinError 10054` resets, so the adapters retry and cache.

## Repository layout

| Path | What lives there |
|---|---|
| `apps/web/` | Astro + React web app, the single front end: globe, field drawing, season film, stripes, cards, rotation panel, PDF. |
| `apps/api/` | The engine: Python 3.12, clean architecture. `domain/agronomy/` is the science, `infrastructure/` the data clients and cache, `application/` the ports and use cases, `interfaces/http/` the live service. YAML region and crop profiles in `resources/`. |
| `infra/` | Deployment notes for Cloud Run and Firebase Hosting (Spanish). Cloud Run is the stretch goal. |
| `scripts/` | `sync_readme_outline.py` keeps the backlog in this README in step with the GitHub issues. `compliance_audit.py` checks the submission rules before the deadline. `probe_sources.py` calls each data source live and prints what came back. |
| `data/raw/` | Downloaded source data (gitignored). |
| `docs/` | Planning documents (English), architecture, data sources, submission checklist, references, the story outline, and the Data Corn working documents (Spanish). |
| `firebase.json` | Firebase Hosting of `apps/web/dist`. No Auth, no database: judges must never hit a login. |

## Data sources

| Source | Role | Priority | Account | In the app today |
|---|---|---|---|---|
| NASA POWER daily (8 parameters, incl. `GWETROOT`, `GWETTOP`) | Climate forcing, ET0, year types, soil wetness. The planting window is simulated from this forcing; soil temperature (`TSOIL1`) is not requested | Must | None | Yes |
| USDA NRCS SSURGO via Soil Data Access | Soil water-holding capacity | Must | None | Yes |
| USDA NASS Crop Sequence Boundaries / CDL | Current rotation of the pilot field (read once) | Must | None | Yes, the CDL through CropScape |
| SMAP `SPL3SMP_E.006` via AppEEARS | Consistency check of simulated soil moisture | Should | Earthdata Login | No: the AppEEARS loader is not built ([#44](https://github.com/RikepilB/Data_corn/issues/44)). SMAP L4 through Earth Engine is written, never run |
| MODIS `MOD13Q1.061` via AppEEARS | NDVI crop calendar and bare windows | Should | Earthdata Login | MODIS NDVI through ORNL DAAC, no account. The harvest and bare-soil windows are not built ([#45](https://github.com/RikepilB/Data_corn/issues/45)) |
| SRTM `SRTMGL1_NC.003` via AppEEARS | Slope for the relative erosion index | Should | Earthdata Login | No: terrain comes from POWER and SSURGO. The erosion index is a separate task ([#46](https://github.com/RikepilB/Data_corn/issues/46)) |
| GRACE / GRACE-FO | Regional water-storage context (about 300 km, not one field) | Should | Earthdata Login | No ([#47](https://github.com/RikepilB/Data_corn/issues/47)) |
| OpenET | Field evapotranspiration cross-check | Could | API key | Earth Engine adapter written, never run |

Product versions, access, probes, licences and fallbacks for each source: [docs/DATA-SOURCES.md](docs/DATA-SOURCES.md), reconciled with what the app calls and probed live on 2026-11-15 ([#16](https://github.com/RikepilB/Data_corn/issues/16)); `python scripts/probe_sources.py` repeats the probes. Licences and citations: [docs/REFERENCES.md](docs/REFERENCES.md).

The app also uses sources that were not in the plan: the FCC Census Area API, NOAA CPC ONI (El Niño / La Niña), the NASA GIBS globe layers and ISRIC SoilGrids; they are in the table under [What works today](#what-works-today). The Earth Engine sources (PRISM, ERA5-Land, SMAP L4, HLS, Sentinel-2, OpenET, NASADEM) are written but have never run; [apps/README.md](apps/README.md) lists more.

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
| [Team action plan](docs/TEAM-ACTION-PLAN.es.md) (Spanish) | Roles, timeline, mentor questions, brand |
| [Prior-art research](docs/research/ANTECEDENTES-maiz-EEUU.es.md) (Spanish) | Existing corn tools and the pivot rationale |

**Path note.** The planning documents were written before the layout moved to the Data Corn app. Where they say `web/`, read `apps/web/`; where they say `pipeline/src/fieldshift/`, read `apps/api/src/datacorn/`. Some of them still describe the dry / normal / wet matrix, which was cut on 2026-11-14: the rotation is now three explained strategies ([#42](https://github.com/RikepilB/Data_corn/issues/42)). The full map is in [docs/planning/README.md](docs/planning/README.md) section 6.

Team plan page (visual version of the Spanish team plan): https://claude.ai/artifact/D3nj2FonudnMYTzJB8JrZA <!-- TODO(owner): set sharing to anyone-with-the-link before submission -->

## Data Corn skeleton documents

Spanish working documents from the skeleton: [arquitectura](docs/arquitectura.md), [flujo](docs/flujo.md), [pantalla](docs/pantalla.md), [requerimientos](docs/requerimientos.md), [reto-field-shift](docs/reto-field-shift.md), [guias-space-apps-2026](docs/guias-space-apps-2026.md) and [solucion-tecnica](docs/solucion-tecnica.md), plus [infra/README.md](infra/README.md) for the Google Cloud steps.

[solucion-tecnica.md](docs/solucion-tecnica.md) still describes an earlier design for Andean sites. The skeleton's scenario axis is El Niño / La Niña; the Field Shift core uses dry, normal and wet year types (decision D7 in [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)), and El Niño / La Niña is not on the Must path.

## Contributing

1. **One branch per task**, named `feat/<slug>`, and a pull request into `main`. Never push to `main` directly.
2. **Tests green before merge**: `cd apps/web && npm run build && npm test`, and for the engine `cd apps/api && uv run --extra dev ruff check src tests && uv run --extra dev pytest -q`. If you touch the map or the flow, also run `npm run test:e2e` after the build (`npx playwright test --workers=1` is the reliable setting on a busy machine).
3. **Contract first**: the contract is the report. Change `report.py`, `report.ts` and `docs/contrato-api.md` together, engine first.
4. **Tests first**: each task starts with failing tests.
5. **SI-assisted files** start with the header `SI-assisted (Claude Code); reviewed by <name>`.
6. **Cite every new source** (data, library, font, image, paper) with a row in `docs/REFERENCES.md` in the same commit.
7. **Missing data is `NaN`, `null` or `not-available`, never 0.** Results are scenarios, never forecasts.
8. **No secrets, raw downloads or personal data** in the repo (see `.gitignore`). No NASA logos or insignia. No login.

The full rules, with acceptance criteria, are in [REQUIREMENTS.md](docs/planning/REQUIREMENTS.md).

## Backlog and milestones

All work is tracked in [GitHub issues](https://github.com/RikepilB/Data_corn/issues): ten epics and the tasks under them. Milestones M0 to M5 are the team checkpoints ([milestones](https://github.com/RikepilB/Data_corn/milestones)).

**Outline of epics and issues.** Each epic is followed by its tasks, with the cut line (Must, Should or Could) and the milestone. GitHub does not sync checkboxes in Markdown files, so run `python scripts/sync_readme_outline.py --apply` (it needs the `gh` CLI) to copy the issue states, titles, cut lines and milestones into the outline and into the two tables under [Status](#status). The issue itself is the source of truth.

- [ ] [#1](https://github.com/RikepilB/Data_corn/issues/1) **EPIC 1 · Team, repo and access setup**
  - [ ] [#11](https://github.com/RikepilB/Data_corn/issues/11) Connect the local scaffold to this repo and open the first PR · Must · M0
  - [ ] [#12](https://github.com/RikepilB/Data_corn/issues/12) Add collaborators and protect `main` · Must · M0
  - [ ] [#13](https://github.com/RikepilB/Data_corn/issues/13) Every member: local environment passes the tests and the build · Must · M0
  - [ ] [#14](https://github.com/RikepilB/Data_corn/issues/14) Firebase: log in, confirm the project, add Editors · Must · M0
  - [ ] [#15](https://github.com/RikepilB/Data_corn/issues/15) Optional offers and accounts (only after the Must path is green) · Could · M3
- [ ] [#2](https://github.com/RikepilB/Data_corn/issues/2) **EPIC 2 · Data sources: investigate, register, verify**
  - [ ] [#16](https://github.com/RikepilB/Data_corn/issues/16) Write the data-source register `docs/DATA-SOURCES.md` · Must · M1
  - [ ] [#17](https://github.com/RikepilB/Data_corn/issues/17) Earthdata Login for each data person · Should · M0
  - [ ] [#18](https://github.com/RikepilB/Data_corn/issues/18) Submit the AppEEARS point request and check the output · Should · M0
  - [ ] [#19](https://github.com/RikepilB/Data_corn/issues/19) Pick the pilot field and read its current rotation · Must · M0
  - [ ] [#20](https://github.com/RikepilB/Data_corn/issues/20) GRACE/GRACE-FO: verify the product and variable · Should · M3
  - [ ] [#21](https://github.com/RikepilB/Data_corn/issues/21) OpenET: decide to use or drop · Could · M3
- [ ] [#3](https://github.com/RikepilB/Data_corn/issues/3) **EPIC 3 · Papers and scientific basis**
  - [ ] [#22](https://github.com/RikepilB/Data_corn/issues/22) Create `docs/PAPERS.md` and keep `docs/REFERENCES.md` complete · Must · M1
  - [ ] [#23](https://github.com/RikepilB/Data_corn/issues/23) FAO-56: confirm tables, equations and the corn critical window · Must · M1
  - [ ] [#24](https://github.com/RikepilB/Data_corn/issues/24) Agronomy sources: planting rule, critical stage, rotation benefits · Must · M1
  - [ ] [#25](https://github.com/RikepilB/Data_corn/issues/25) Soil, erosion and SMAP method sources · Should · M3
  - [ ] [#26](https://github.com/RikepilB/Data_corn/issues/26) Ogallala, GRACE and LEMA context for the story and Impact · Should · M3
- [ ] [#4](https://github.com/RikepilB/Data_corn/issues/4) **EPIC 4 · Validate the idea**
  - [ ] [#27](https://github.com/RikepilB/Data_corn/issues/27) Mentor round 1: state, field, rotations, year types, thresholds (Q1-Q4) · Must · M1
  - [ ] [#28](https://github.com/RikepilB/Data_corn/issues/28) Mentor round 2: validation, erosion, uncertainty, judging (Q5-Q10) + Local Lead schedule · Should · M2
  - [ ] [#29](https://github.com/RikepilB/Data_corn/issues/29) Prior art and the differentiation statement · Must · M2
  - [ ] [#30](https://github.com/RikepilB/Data_corn/issues/30) Plausibility gate for the twin (checkpoint 2) · Must · M2
  - [ ] [#31](https://github.com/RikepilB/Data_corn/issues/31) Judging-rubric self-assessment (checkpoint 3 and freeze) · Must · M3
- [ ] [#5](https://github.com/RikepilB/Data_corn/issues/5) **EPIC 5 · Clean Architecture and engineering foundation**
  - [ ] [#32](https://github.com/RikepilB/Data_corn/issues/32) Layering rule written down and enforced by a test · Must · M1
  - [ ] [#33](https://github.com/RikepilB/Data_corn/issues/33) Contract-first workflow and PR template · Must · M1
  - [ ] [#34](https://github.com/RikepilB/Data_corn/issues/34) GitHub Actions: tests and build on every PR · Should · M2
- [ ] [#6](https://github.com/RikepilB/Data_corn/issues/6) **EPIC 6 · Pipeline: adapters → domain → usecases (Python)**
  - [x] [#35](https://github.com/RikepilB/Data_corn/issues/35) Task 1 · Contract semantic validator · Must · M1
  - [x] [#36](https://github.com/RikepilB/Data_corn/issues/36) Task 2 · Cached HTTP + NASA POWER adapter · Must · M1
  - [x] [#37](https://github.com/RikepilB/Data_corn/issues/37) Task 3 · FAO-56 reference evapotranspiration · Must · M1
  - [x] [#38](https://github.com/RikepilB/Data_corn/issues/38) Task 4 · SSURGO soil profile -> available water · Must · M2
  - [x] [#39](https://github.com/RikepilB/Data_corn/issues/39) Task 5 · Crop parameters and site config · Must · M2
  - [x] [#40](https://github.com/RikepilB/Data_corn/issues/40) Task 6 · Daily balance per rotation: rainfed and full-irrigation runs (one season exists) · Must · M2
  - [ ] [#41](https://github.com/RikepilB/Data_corn/issues/41) Task 7 · Dry / normal / wet summary of the corn year (Should) · Should · M1
  - [ ] [#42](https://github.com/RikepilB/Data_corn/issues/42) Task 8 · Three explained rotation strategies (contract field, engine options, web panel) · Must · M2
  - [x] [#43](https://github.com/RikepilB/Data_corn/issues/43) Task 9 · `build_site_ficha` use case and CLI (first real ficha) · Must · M2
  - [ ] [#44](https://github.com/RikepilB/Data_corn/issues/44) Task 10 · AppEEARS loader + SMAP consistency check · Should · M3
  - [ ] [#45](https://github.com/RikepilB/Data_corn/issues/45) Task 11 · NDVI harvest and bare-soil windows (green-up exists) · Should · M3
  - [ ] [#46](https://github.com/RikepilB/Data_corn/issues/46) Task 12 · Relative erosion index · Should · M3
  - [ ] [#47](https://github.com/RikepilB/Data_corn/issues/47) Task 15 · GRACE regional water context · Should · M3
- [ ] [#7](https://github.com/RikepilB/Data_corn/issues/7) **EPIC 7 · Web (Astro) and Firebase Hosting**
  - [x] [#48](https://github.com/RikepilB/Data_corn/issues/48) Task 13a · Vitest and unit tests for the web helpers (ficha types wait on #7) · Must · M1
  - [x] [#49](https://github.com/RikepilB/Data_corn/issues/49) Task 13b · Tool page: planting strip, matrix, rotation cards · Must · M1
  - [x] [#50](https://github.com/RikepilB/Data_corn/issues/50) Task 13c · Field map (MapLibre island) · Should · M3
  - [x] [#51](https://github.com/RikepilB/Data_corn/issues/51) Task 13d · End-to-end smoke test (Playwright) · Must · M2
  - [ ] [#52](https://github.com/RikepilB/Data_corn/issues/52) Task 14a · Deploy v0 (synthetic example) to Firebase Hosting · Must · M1
  - [ ] [#53](https://github.com/RikepilB/Data_corn/issues/53) Task 14b · Serve real results (precomputed reports or API) and check public access · Must · M2
- [ ] [#8](https://github.com/RikepilB/Data_corn/issues/8) **EPIC 8 · UI/UX and brand**
  - [ ] [#54](https://github.com/RikepilB/Data_corn/issues/54) Decide the name and the tagline · Must · M1
  - [ ] [#55](https://github.com/RikepilB/Data_corn/issues/55) Design tokens, fonts and accessibility baseline · Must · M1
  - [ ] [#56](https://github.com/RikepilB/Data_corn/issues/56) Mobile-first wireframes for the tool page · Must · M1
  - [ ] [#57](https://github.com/RikepilB/Data_corn/issues/57) UX copy in plain English · Must · M2
  - [ ] [#58](https://github.com/RikepilB/Data_corn/issues/58) Outsider usability test on a phone (2 minutes) · Must · M4
- [ ] [#9](https://github.com/RikepilB/Data_corn/issues/9) **EPIC 9 · Storytelling and demo**
  - [x] [#59](https://github.com/RikepilB/Data_corn/issues/59) Story outline: the orbital observer · Must · M2
  - [ ] [#60](https://github.com/RikepilB/Data_corn/issues/60) Story page `index.astro` in English · Must · M3
  - [ ] [#61](https://github.com/RikepilB/Data_corn/issues/61) Decide the demo format: 7 slides or 30-second video · Must · M1
  - [ ] [#62](https://github.com/RikepilB/Data_corn/issues/62) Demo deck (7 slides, public link) · Must · M4
  - [ ] [#63](https://github.com/RikepilB/Data_corn/issues/63) Project page text (English) for the submission form · Must · M4
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

- **Tools.** Claude Code (Anthropic), credited as co-author in the commits it helped write (Claude Fable 5.2, Opus 5.5 and Sonnet 5.5). Codex (OpenAI) helped write the relative erosion index ([#46](https://github.com/RikepilB/Data_corn/issues/46)).
- **What SI helped with.** Most of the code in `apps/` and `scripts/`, the tests, the planning documents, the GitHub issues, the summaries of the sources we read, and this README. Read every source file and document here as SI-assisted unless its header says otherwise. The header `SI-assisted (<tool>); reviewed by <name>` names a reviewer only after that person has read the file ([#66](https://github.com/RikepilB/Data_corn/issues/66)).
- **What did not come from SI.** The solution idea, the choice of challenge and the design decisions came from Team DataCorn. Every number in a report is computed by the engine from public data (NASA POWER, SSURGO, CDL, MODIS, NOAA) with the methods cited in [REFERENCES.md](docs/REFERENCES.md). No SI model writes or estimates any value.
- **No SI at run time.** The API and the web app call no SI model and have no SI dependency.
- **Media.** The only image in the app is the favicon, a small SVG written as code with SI assistance. Any SI-generated image, video or audio in the demo or the slides carries a visible watermark and is listed here. No NASA logo or insignia appears anywhere.

## Licence

[Apache-2.0](LICENSE). Third-party data and libraries keep their own licences, listed in [docs/REFERENCES.md](docs/REFERENCES.md).

Field Shift is a hackathon project. It is not affiliated with or endorsed by NASA or the USDA. NASA and USDA are named only as data sources.
