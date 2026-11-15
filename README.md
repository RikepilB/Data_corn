<!-- SI-assisted (Claude Code); reviewed by <name> -->
# Field Shift

**Decision support for corn producers: which rotation to run, when to plant, and at which growth stage water runs short.**

Built by Team DataCorn for the NASA Space Apps Challenge 2026: [Field Shift: Adapting Farms with NASA Data](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/) (Trujillo local event).

**Try it live (provisional, sample data only):** [field-shift-datacorn.vercel.app](https://field-shift-datacorn.vercel.app/?mock=1). There is no API behind this link, so every number on it is a sample.

> **Scenarios from historical climate, not forecasts.** The tool supports a producer's judgment and local agronomic advice. It does not replace them.
"Google Earth for corn":
- Start on a 3D globe with NASA climate layers: soil moisture, rain, heat and vegetation, on a time slider.
- Fly to your location, tap the corners of your field and enter a few field facts.
- Get one simple screen that both the farm manager and the agronomist can read:
  - an animated **season film** over the map (soil water day by day);
  - **25-season climate stripes** for that field, with El Niño / La Niña years marked;
  - six key cards: planting window (or season progress), water at flowering, heat at flowering,
    hybrid fit and frost, irrigation or waterlogging, and corn-after-corn vs. corn-after-soybean.
- The full report downloads as a PDF.

The first region is the United States (demo state: Nebraska). New countries (Peru, Brazil,
Argentina, …) are added with a region profile, without changing the domain or the screen.

## The idea in one paragraph

Field Shift runs a soil-water model (FAO-56) for one field over daily NASA POWER climate (target record 1981-2025) and USDA SSURGO soil. It compares the field's current rotation with alternatives. For dry, normal and wet years it shows how often each rotation would run short of water if it were not irrigated, how much irrigation it would need, how long the soil stays bare, and when corn can be planted. The proposed pilot area is Sheridan County in western Kansas, over the Ogallala aquifer (to be confirmed with a mentor).

## The problem

Corn producers in western Kansas irrigate from the Ogallala aquifer, which is declining in the southern High Plains. Dry and wet seasons differ a lot, and in April nobody knows which kind of season is coming. Public tools each cover one piece (planting dates, current soil moisture, water already used, cover-crop choice). Our research found no public tool that compares rotations for one field across dry, normal and wet years. That is the gap Field Shift addresses. Details, sources and the limits of what we claim: [docs/planning/PROBLEM.md](docs/planning/PROBLEM.md).

## What the tool shows

The tool page reads top to bottom in this order:

1. **Field**: where the pilot field is (map, optional).
2. **Planting window**: when corn is typically ready to plant and the usual last spring frost, over all years first, then by year type.
3. **Matrix**: rows are rotations (the current one first), columns are dry, normal and wet years. Each cell shows stress days if not irrigated, stress at tasseling and silking, irrigation needed, and bare-soil days. Every number is a median with a p10 to p90 range, and every cell carries a confidence level with its reason.
4. **Rotation cards**: why the rotation is suggested, the evidence, the benefits, what we don't know, and risks that someone local must review.
5. **Priorities**: the producer picks what matters (water use, forage, nitrogen fixing, erosion, organic matter, market) and the rotations are re-ordered. The current rotation always stays first.
6. **Disclaimer**: always visible.

Missing data is shown as "no data", never as zero. Units are US units (inches, °F, acres). No login, no accounts.

## How the repository fits together

This repository joins two pieces of work into one codebase, laid out as the Data Corn skeleton (decision of 2026-11-14: the skeleton's layout is the trunk).

- **`apps/api/`** is the engine home: Python 3.12 in Clean Architecture (domain, application, infrastructure, interfaces), with a test that enforces the dependency rule. The Field Shift science fills its stubs: the FAO-56 reference evapotranspiration, the daily soil-water balance, the dry/normal/wet year types, the planting window and the rotation comparison go in `apps/api/src/datacorn/domain/agronomy/`; the NASA POWER and USDA SSURGO clients go in `apps/api/src/datacorn/infrastructure/`. Its live HTTP service (FastAPI on Cloud Run, Earth Engine) is a stretch goal: the Must path needs no Google Cloud project.
- **`apps/web/`** is the single web app: Astro, React and MapLibre, with the skeleton's 3D globe and field drawing. The Field Shift tool page (planting strip, matrix, rotation cards) is built into it.
- **`contracts/`** will hold the one contract between engine and web, `ficha.schema.json` (v0.2.0), with a synthetic example. It arrives with the next pull request ([#11](https://github.com/RikepilB/Data_corn/issues/11)).
- **The demo is precompute-first.** The engine runs offline for the demo fields, using NASA POWER and USDA SSURGO only (no Earth Engine), and writes one JSON "ficha" per field to `apps/web/public/data/fichas/`. The site is static on Firebase Hosting, with no server to keep alive while the judges look.

Each part has its own guide: this README for Field Shift as a whole, and [apps/README.md](apps/README.md) for the skeleton (its original README, with only the links adjusted).

## Status

Hackathon build in progress. Submission closes Sun 2026-11-15 23:59 PET (internal target 20:00 PET). State on 2026-11-14:

| Piece | State |
|---|---|
| Contract `contracts/ficha.schema.json` v0.2.0 and a synthetic example ficha | Exist on a team member's machine (the 9 contract tests passed there at 15:00 PET) but are **not in this repository yet**. They arrive in the next pull request ([#11](https://github.com/RikepilB/Data_corn/issues/11)). |
| Engine (`apps/api/`) | Skeleton: ports, use-case skeletons, region and crop profiles, a cache, and a test of the dependency rule. `GET /api/v1/health`, `/regions` and `/demo-fields` work (the skeleton's own claim; we have not run it); field analysis returns `501`. **Every science function is still a stub**: 59 `NotImplementedError` in 29 files (counted on 2026-11-14). The plan's Tasks 1-12 and 15 fill them. |
| Web app (`apps/web/`) | Skeleton: Astro 7, React 19, MapLibre GL, English and Spanish text. The Field Shift tool page (planting strip, matrix, rotation cards) is not built into it yet. |
| Hosting | **Live, provisional:** [field-shift-datacorn.vercel.app](https://field-shift-datacorn.vercel.app/?mock=1), a static build of `main` (2026-11-14) on Vercel's free plan. It shows sample data only and is not redeployed automatically. Firebase project `field-shift-datacorn` exists (Spark plan, no Auth, no Firestore); its address `field-shift-datacorn.web.app` goes live with the first Firebase deploy, [#52](https://github.com/RikepilB/Data_corn/issues/52), and replaces the Vercel link. |
| Results | None yet. No real ficha has been generated; the only ficha is the synthetic example, labelled as such. |

## Tech stack and architecture

| Layer | Choice |
|---|---|
| Engine | `apps/api/`: Python 3.12, numpy, scipy, httpx, pytest, ruff; `jsonschema` planned for the contract test |
| Contract | JSON Schema (draft 2020-12), `contracts/ficha.schema.json` v0.2.0 |
| Web | `apps/web/`: Astro 7, React 19, TypeScript 6, MapLibre GL JS, Recharts, Terra Draw; planned: Vitest, Playwright |
| Live service (stretch) | FastAPI on Cloud Run with Google Earth Engine, in `apps/api/`; needs a billing-enabled Google Cloud project |
| Hosting | Firebase Hosting on the free Spark plan. No Auth, no database. |

**Clean Architecture, contract-first.**

- `apps/api/src/datacorn/domain/` is pure science (FAO-56 water balance, year types, planting window). It does no I/O and imports nothing from `application/`, `infrastructure/` or `interfaces/`.
- `apps/api/src/datacorn/infrastructure/` holds all I/O: POWER, SSURGO, the AppEEARS loader (planned), the cache, and the Earth Engine adapters of the live service.
- `apps/api/src/datacorn/application/` holds the ports and the use cases that orchestrate the two; `bootstrap.py` is the only place where the layers are wired. A test (`apps/api/tests/unit/test_architecture.py`) enforces the dependency rule.
- The engine runs offline and writes **one JSON "ficha" per field**, validated against the contract before it is written. The web only reads and renders fichas, converting SI units to US units for display. It never computes science.
- Every test runs without network access, from recorded fixtures.

Design decisions and the system diagram: [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) (written before the move to `apps/api/`; read its `pipeline/` as `apps/api/`, see the map in [docs/planning/README.md](docs/planning/README.md) section 6).

```text
NASA POWER daily + USDA SSURGO soil   (optional: SMAP, MODIS NDVI, SRTM, GRACE)
        |
        v   apps/api/  (Python, offline build, every download cached)
  infrastructure  ->  domain (FAO-56 twin, year types, planting window)  ->  application (builds the ficha)
        |
        v
  one ficha JSON per field, validated against contracts/ficha.schema.json
        |
        v
  apps/web/ (Astro, static: story page + tool page)  ->  Firebase Hosting
```

## Quickstart

Run the commands from the repository root. You need Node 22.23.4 or later and Python 3.12.

Web app:

```bash
cd apps/web && npm install && npm run dev
```

The dev server listens on http://localhost:4321 and proxies `/api` to `localhost:8080`. `npm run build` type-checks and builds to `apps/web/dist`.

Engine and live API:
## Status

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

- **Tests:** 63 API tests cover the domain math, the use cases end to end with fakes, the Earth Engine adapters with a fake session, the clean-architecture dependency rule and the API. The web has 34 unit tests and a Playwright smoke test.
- **Timing on the sample field:**
  - closing the field (`describe`) takes about 9 s;
  - results (`analyze`) take under 1 s;
  - a past or current season adds the MODIS NDVI download, about 1 minute.

## Pending tasks

### Needs accounts
- [ ] New Google Cloud project ($300 trial), deployed with Cloud Run (API) and Firebase Hosting (web). See [infra/README.md](infra/README.md).
- [ ] Register the project for Earth Engine. That unlocks the in-field zones (Sentinel-2), field NDVI at 30 m (HLS), the drought layer, and PRISM, SMAP and OpenET. The adapters in `apps/api/src/datacorn/infrastructure/earthengine/` are written and unit-tested without network, but **they have not been run against Earth Engine yet**. Turn them on with `DATACORN_EARTH_ENGINE_ENABLED=true`; while it is off, or if Earth Engine fails, each one is skipped and the no-account source answers.
- [ ] USDA NASS QuickStats API key (`DATACORN_NASS_API_KEY`) for county corn yields. The adapter is already written.
- [ ] Earthdata login for ECOSTRESS (AppEEARS).

### Product
- [ ] Precompute 3–4 demo fields (Nebraska irrigated and rainfed, Iowa, Kansas) so the demo is instant.
- [ ] Review the corn parameters marked `verificar` in `apps/api/src/datacorn/resources/crops/maize.yaml` with an agronomist, and calibrate them against NASS county yields once the key is available.
- [ ] Shared links with the field in the URL (RF-42).

### Space Apps submission
- [ ] Demo: video of 30 s or less with English subtitles, or 7 slides or fewer, in English.
- [ ] Project page in English, every dataset cited, AI use declared.
- [ ] Submit before Sunday, November 15, 2026, 23:59 local time.

### Later: more countries
- [ ] Peru: ICEN (coastal El Niño), MapBiomas Peru, MIDAGRI
- [ ] Brazil: MapBiomas Brazil, CONAB / IBGE
- [ ] Argentina: MapBiomas Argentina, MAGyP

## Repository layout

| Path | What |
|---|---|
| `apps/api/` | Python 3.12 + FastAPI backend (Cloud Run), clean architecture |
| `apps/web/` | Astro + React frontend: globe, steps, film, stripes, cards, PDF |
| `docs/` | Challenge text, flow, screen, requirements, architecture, API contract (team docs in Spanish) |
| `infra/` | Deployment notes: Cloud Run, Firebase Hosting, budget |

See [docs/arquitectura.md](docs/arquitectura.md), [docs/requerimientos.md](docs/requerimientos.md) and
[docs/contrato-api.md](docs/contrato-api.md).

## Run locally

API (Python 3.12+), no keys needed:

```bash
cd apps/api
python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn datacorn.main:app --port 8080
pytest
```

Deploy the web app:

```bash
cd apps/web && npm run build && cd ../.. && npx firebase-tools deploy --only hosting --project field-shift-datacorn
```

The last command deploys to Firebase Hosting. Only the project owner runs it, and nothing has been deployed yet ([#52](https://github.com/RikepilB/Data_corn/issues/52)). `firebase.json` also rewrites `/api/**` to a Cloud Run service named `datacorn-api`, which is not deployed; the first static deploy is planned without that rewrite.

### Local configuration

Credentials never go in the repository.

- **NASA Earthdata** (SMAP, MODIS, GRACE through AppEEARS and `earthaccess`): each person logs in once with their own account. The login is stored in `~/.netrc`, outside the repo.

  ```bash
  cd apps/api && pip install earthaccess && python -c "import earthaccess; earthaccess.login(persist=True)"
  ```

- **Pilot field**: the engine reads the pilot field's definition from a config file whose location is set in plan Task 5 ([#39](https://github.com/RikepilB/Data_corn/issues/39)); the skeleton keeps its demo fields in `apps/api/src/datacorn/resources/demo/fields.json`. Once Task 9 lands ([#43](https://github.com/RikepilB/Data_corn/issues/43)), an offline build command writes the fichas to `apps/web/public/data/fichas/`. That command does not exist yet.
- **Firebase**: the project is `field-shift-datacorn`. Run `npx firebase-tools login` once; the owner adds teammates as Editors in the console. Accounts and offers: [docs/setup/ACCOUNTS.md](docs/setup/ACCOUNTS.md).
- **Google Cloud** (only for the stretch-goal live service): see [infra/README.md](infra/README.md) (Spanish).

**Network note (one Windows machine):** Git-Bash `curl` fails TLS against `power.larc.nasa.gov` and `spaceappschallenge.org`. Python, PowerShell and `curl.exe` work. Python requests also hit occasional `WinError 10054` resets, so the adapters retry and cache.

## Repository layout

| Path | What lives there |
|---|---|
| `apps/web/` | Astro + React web app, the single front end. The Field Shift tool page reads `apps/web/public/data/fichas/*.json`. |
| `apps/api/` | The engine: Python 3.12, clean architecture. `domain/agronomy/` is the science, `infrastructure/` the data clients and cache, `application/` the ports and use cases, `interfaces/http/` the live service. YAML region and crop profiles in `resources/`. |
| `infra/` | Deployment notes for Cloud Run and Firebase Hosting (Spanish). Cloud Run is the stretch goal. |
| `contracts/` | The one contract between engine and web (`ficha.schema.json`) and a synthetic example ficha. Arrives with the next pull request. |
| `data/raw/` | Downloaded source data (gitignored). |
| `docs/` | Planning documents (English), architecture, implementation plan, data sources, submission checklist, references, and the Data Corn working documents (Spanish). |
| `firebase.json` | Firebase Hosting of `apps/web/dist`. No Auth, no database: judges must never hit a login. |

## Data sources

| Source | Role | Priority | Account |
|---|---|---|---|
| NASA POWER daily (incl. `TSOIL1`, `GWETTOP`) | Climate forcing, ET0, year types, planting window | Must | None |
| USDA NRCS SSURGO via Soil Data Access | Soil water-holding capacity | Must | None |
| USDA NASS Crop Sequence Boundaries / CDL | Current rotation of the pilot field (read once) | Must | None |
| SMAP `SPL3SMP_E.006` via AppEEARS | Consistency check of simulated soil moisture | Should | Earthdata Login |
| MODIS `MOD13Q1.061` via AppEEARS | NDVI crop calendar and bare windows | Should | Earthdata Login |
| SRTM `SRTMGL1_NC.003` via AppEEARS | Slope for the relative erosion index | Should | Earthdata Login |
| GRACE / GRACE-FO | Regional water-storage context (about 300 km, not one field) | Should | Earthdata Login |
| OpenET | Field evapotranspiration cross-check | Could | API key |

Product versions, access, probes, licences and fallbacks for each source: [docs/DATA-SOURCES.md](docs/DATA-SOURCES.md). Licences and citations: [docs/REFERENCES.md](docs/REFERENCES.md).

The `apps/api` skeleton plans more sources, mostly through Google Earth Engine (PRISM, NLDAS, NASA GIBS layers, GPM IMERG, HLS, ECOSTRESS, ERA5-Land, NOAA ONI and others). They are listed in [apps/README.md](apps/README.md) and are not part of the Must path.

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
| [Implementation plan](docs/superpowers/plans/2026-11-14-field-shift-mvp.md) | 15 test-driven tasks |
| [SUBMISSION-COMPLIANCE.md](docs/submission/SUBMISSION-COMPLIANCE.md) | Verified rules and the pre-submit checklist |
| [Team action plan](docs/TEAM-ACTION-PLAN.es.md) (Spanish) | Roles, timeline, mentor questions, brand |
| [Prior-art research](docs/research/ANTECEDENTES-maiz-EEUU.es.md) (Spanish) | Existing corn tools and the pivot rationale |

**Path note.** The planning documents and the implementation plan were written before the layout moved to the Data Corn skeleton. Where they say `web/`, read `apps/web/`; where they say `pipeline/src/fieldshift/`, read `apps/api/src/datacorn/`. The full map is in [docs/planning/README.md](docs/planning/README.md) section 6.

Team plan page (visual version of the Spanish team plan): https://claude.ai/artifact/D3nj2FonudnMYTzJB8JrZA <!-- TODO(owner): set sharing to anyone-with-the-link before submission -->

## Data Corn skeleton documents

Spanish working documents from the skeleton: [arquitectura](docs/arquitectura.md), [flujo](docs/flujo.md), [pantalla](docs/pantalla.md), [requerimientos](docs/requerimientos.md), [reto-field-shift](docs/reto-field-shift.md), [guias-space-apps-2026](docs/guias-space-apps-2026.md) and [solucion-tecnica](docs/solucion-tecnica.md), plus [infra/README.md](infra/README.md) for the Google Cloud steps.

[solucion-tecnica.md](docs/solucion-tecnica.md) still describes an earlier design for Andean sites. The skeleton's scenario axis is El Niño / La Niña; the Field Shift core uses dry, normal and wet year types (decision D7 in [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)), and El Niño / La Niña is not on the Must path.

## Contributing

1. **One branch per task**, named `feat/<slug>`, and a pull request into `main`. Never push to `main` directly.
2. **Tests green before merge**: `cd apps/web && npm run build` (type check and build) and, for the engine, `cd apps/api && pytest`. Add `npm test` once the web tests land.
3. **Contract first**: change `contracts/ficha.schema.json`, then the engine and the web.
4. **Tests first**: each task in the implementation plan starts with failing tests.
5. **SI-assisted files** start with the header `SI-assisted (Claude Code); reviewed by <name>`.
6. **Cite every new source** (data, library, font, image, paper) with a row in `docs/REFERENCES.md` in the same commit.
7. **Missing data is `NaN`, `null` or `not-available`, never 0.** Results are scenarios, never forecasts.
8. **No secrets, raw downloads or personal data** in the repo (see `.gitignore`). No NASA logos or insignia. No login.

The full rules, with acceptance criteria, are in [REQUIREMENTS.md](docs/planning/REQUIREMENTS.md).

## Backlog and milestones

All work is tracked in [GitHub issues](https://github.com/RikepilB/Data_corn/issues): ten epics and the tasks under them. Milestones M0 to M5 are the team checkpoints ([milestones](https://github.com/RikepilB/Data_corn/milestones)).

**Outline of epics and issues.** Each epic is followed by its tasks, with the cut line (Must, Should or Could) and the milestone. The boxes are a snapshot of 2026-11-14: GitHub does not sync checkboxes in Markdown files, so tick a box here when its issue closes. The issue itself is the source of truth.

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
  - [ ] [#48](https://github.com/RikepilB/Data_corn/issues/48) Task 13a · Vitest and unit tests for the web helpers (ficha types wait on #7) · Must · M1
  - [x] [#49](https://github.com/RikepilB/Data_corn/issues/49) Task 13b · Tool page: planting strip, matrix, rotation cards · Must · M1
  - [x] [#50](https://github.com/RikepilB/Data_corn/issues/50) Task 13c · Field map (MapLibre island) · Should · M3
  - [ ] [#51](https://github.com/RikepilB/Data_corn/issues/51) Task 13d · End-to-end smoke test (Playwright) · Must · M2
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

The 2026 rules say "SI" where earlier years said "AI". This repository was scaffolded with SI assistance: Claude Code (Anthropic) helped with the project structure, the contract draft, the planning documents and this README. The Data Corn skeleton (`apps/`, `infra/` and the Spanish documents in `docs/`) was also written with Claude Code; its commit credits Claude Opus 5.5 as co-author. The solution idea and the design decisions came from Team DataCorn. SI-assisted source files and documents say so in a header comment, with the name of the team member who reviewed them; the files added with the skeleton are still to be brought in line ([#66](https://github.com/RikepilB/Data_corn/issues/66)). Any SI-generated image or video in the demo carries a visible watermark. Other SI tools, if used, are listed here before submission ([#66](https://github.com/RikepilB/Data_corn/issues/66)).

## Licence
Open `http://localhost:4321/?mock=1` to try the screen with sample data and no API.

[Apache-2.0](LICENSE). Third-party data and libraries keep their own licences, listed in [docs/REFERENCES.md](docs/REFERENCES.md).

Field Shift is a hackathon project. It is not affiliated with or endorsed by NASA or the USDA. NASA and USDA are named only as data sources.
