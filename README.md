<!-- SI-assisted (Claude Code); reviewed by <name> -->
# Field Shift

**Decision support for corn producers: which rotation to run, when to plant, and at which growth stage water runs short.**

Built by Team DataCorn for the NASA Space Apps Challenge 2026: [Field Shift: Adapting Farms with NASA Data](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/) (Trujillo local event).

> **Scenarios from historical climate, not forecasts.** The tool supports a producer's judgment and local agronomic advice. It does not replace them.

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

This repository joins two pieces of work into one product.

- **Field Shift core** (`contracts/`, `pipeline/`): an offline Python pipeline that turns NASA POWER climate and USDA soil data into one validated JSON "ficha" per field, with the rotation by year-type matrix. This is the product we submit.
- **Data Corn skeleton** (`apps/web/`, `apps/api/`, `infra/`): a web app with a 3D globe and field drawing, plus an optional live API on Google Cloud. The Field Shift tool page will be built into `apps/web/`, the single web app. `apps/api/` is parked: it needs a Google Cloud project and Earth Engine access that the Must path does not use, and it is the route to other regions after the hackathon.

Each part has its own guide: this README for Field Shift, [apps/README.md](apps/README.md) for the skeleton.

## Status

Hackathon build in progress. Submission closes Sun 2026-11-15 23:59 PET (internal target 20:00 PET). State on 2026-11-14:

| Piece | State |
|---|---|
| Contract `contracts/ficha.schema.json` v0.2.0, a synthetic example ficha, and the pipeline package (`pipeline/`) | Exist on a team member's machine (`uv run pytest`: 9 passed at 15:00 PET) but are **not in this repository yet**. They arrive in the next pull request ([#11](https://github.com/RikepilB/Data_corn/issues/11)). The science modules are the plan's Tasks 1-12 and 15 and are not implemented yet. |
| Web app (`apps/web/`) | Skeleton from the Data Corn start: Astro 7, React 19, MapLibre GL, English and Spanish text. The Field Shift tool page (planting strip, matrix, rotation cards) is not built into it yet. |
| Live API (`apps/api/`) | Skeleton: `GET /api/v1/health`, `/regions` and `/demo-fields` work; field analysis returns `501`. Parked (see above). |
| Hosting | Firebase project `field-shift-datacorn` exists (Spark plan, no Auth, no Firestore). **Nothing is deployed.** The planned address `field-shift-datacorn.web.app` goes live with the first deploy, [#52](https://github.com/RikepilB/Data_corn/issues/52). |
| Results | None yet. No real ficha has been generated; the only ficha is the synthetic example, labelled as such. |

## Tech stack and architecture

| Layer | Choice |
|---|---|
| Pipeline | Python 3.12, uv, numpy, pandas, requests, jsonschema, pytest |
| Contract | JSON Schema (draft 2020-12), `contracts/ficha.schema.json` v0.2.0 |
| Web | `apps/web/`: Astro 7, React 19, TypeScript 6, MapLibre GL JS, Recharts, Terra Draw; planned: Vitest, Playwright |
| Live API (parked) | `apps/api/`: Python 3.12, FastAPI, Google Earth Engine, Cloud Run |
| Hosting | Firebase Hosting on the free Spark plan. No Auth, no database. |

**Clean Architecture, contract-first.**

- `pipeline/src/fieldshift/domain/` is pure science (FAO-56 water balance, year types, planting window). It does no I/O and imports nothing from `adapters/` or `usecases/`.
- `pipeline/src/fieldshift/adapters/` holds all I/O: POWER, SSURGO, AppEEARS, the HTTP cache, the CLI.
- `pipeline/src/fieldshift/usecases/` orchestrates the two and builds the ficha.
- The pipeline runs offline and writes **one JSON "ficha" per field**, validated against the contract before it is written. The web only reads and renders fichas, converting SI units to US units for display. It never computes science.
- Every test runs without network access, from recorded fixtures.
- `apps/api/` follows the same layering (domain, application, infrastructure, interfaces) and has a test that enforces its dependency rule.

Design decisions and the system diagram: [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md).

```text
NASA POWER daily + USDA SSURGO soil   (optional: SMAP, MODIS NDVI, SRTM, GRACE)
        |
        v   pipeline/  (Python, offline, every download cached)
  adapters  ->  domain (FAO-56 twin, year types, planting window)  ->  usecases
        |
        v
  one ficha JSON per field, validated against contracts/ficha.schema.json
        |
        v
  apps/web/ (Astro, static: story page + tool page)  ->  Firebase Hosting
```

## Quickstart

Run the commands from the repository root. You need Node 22.23.4 or later, plus Python 3.12 for the API and the pipeline, and [uv](https://docs.astral.sh/uv/) for the pipeline.

Web app:

```bash
cd apps/web && npm install && npm run dev
```

The dev server listens on http://localhost:4321 and proxies `/api` to `localhost:8080`. `npm run build` type-checks and builds to `apps/web/dist`.

Live API (parked):

```bash
cd apps/api
python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn datacorn.main:app --reload --port 8080
pytest
```

Pipeline (arrives with the next pull request, [#11](https://github.com/RikepilB/Data_corn/issues/11)):

```bash
cd pipeline && uv sync && uv run pytest
```

Deploy the web app:

```bash
cd apps/web && npm run build && cd ../.. && npx firebase-tools deploy --only hosting --project field-shift-datacorn
```

The last command deploys to Firebase Hosting. Only the project owner runs it, and nothing has been deployed yet ([#52](https://github.com/RikepilB/Data_corn/issues/52)). `firebase.json` also rewrites `/api/**` to a Cloud Run service named `datacorn-api`, which is not deployed.

### Local configuration

Credentials never go in the repository.

- **NASA Earthdata** (SMAP, MODIS, GRACE through AppEEARS and `earthaccess`): each person logs in once with their own account. The login is stored in `~/.netrc`, outside the repo.

  ```bash
  cd pipeline && uv run --extra earthdata python -c "import earthaccess; earthaccess.login(persist=True)"
  ```

- **Pilot site**: the pipeline reads a site config at `pipeline/config/sites/<site-id>.json` (plan Task 5). Once Task 9 lands ([#43](https://github.com/RikepilB/Data_corn/issues/43)) a ficha is built with `fieldshift build --site config/sites/<site-id>.json --out ../apps/web/public/data/fichas`, run from `pipeline/`. These files do not exist yet.
- **Firebase**: the project is `field-shift-datacorn`. Run `npx firebase-tools login` once; the owner adds teammates as Editors in the console. Accounts and offers: [docs/setup/ACCOUNTS.md](docs/setup/ACCOUNTS.md).
- **Google Cloud** (only for the parked API): see [infra/README.md](infra/README.md) (Spanish).

**Network note (one Windows machine):** Git-Bash `curl` fails TLS against `power.larc.nasa.gov` and `spaceappschallenge.org`. Python, PowerShell and `curl.exe` work. Python requests also hit occasional `WinError 10054` resets, so the adapters retry and cache.

## Repository layout

| Path | What lives there |
|---|---|
| `apps/web/` | Astro + React web app, the single front end. The Field Shift tool page reads `apps/web/public/data/fichas/*.json`. |
| `apps/api/` | Parked live API: FastAPI on Cloud Run, clean architecture, YAML region profiles. |
| `infra/` | Deployment notes for Cloud Run and Firebase Hosting (Spanish). |
| `contracts/` | The one contract between pipeline and web (`ficha.schema.json`) and a synthetic example ficha. Arrives with the next pull request. |
| `pipeline/` | Python 3.12 + uv. `adapters/` fetch and cache data, `domain/` is pure science, `usecases/` builds fichas. Arrives with the next pull request. |
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

**Path note.** The planning documents were written before the web app moved to `apps/web/`. Where they say `web/`, read `apps/web/` (see the conventions in [docs/planning/README.md](docs/planning/README.md)).

Team plan page (visual version of the Spanish team plan): https://claude.ai/artifact/D3nj2FonudnMYTzJB8JrZA <!-- TODO(owner): set sharing to anyone-with-the-link before submission -->

## Data Corn skeleton documents

Spanish working documents from the skeleton: [arquitectura](docs/arquitectura.md), [flujo](docs/flujo.md), [pantalla](docs/pantalla.md), [requerimientos](docs/requerimientos.md), [reto-field-shift](docs/reto-field-shift.md), [guias-space-apps-2026](docs/guias-space-apps-2026.md) and [solucion-tecnica](docs/solucion-tecnica.md), plus [infra/README.md](infra/README.md) for the Google Cloud steps.

[solucion-tecnica.md](docs/solucion-tecnica.md) still describes an earlier design for Andean sites. The skeleton's scenario axis is El Niño / La Niña; the Field Shift core uses dry, normal and wet year types (decision D7 in [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)), and El Niño / La Niña is not on the Must path.

## Contributing

1. **One branch per task**, named `feat/<slug>`, and a pull request into `main`. Never push to `main` directly.
2. **Tests green before merge**: `cd apps/web && npm run build` (type check and build) and, for the parts you touched, `cd apps/api && pytest` and `cd pipeline && uv run pytest` (the pipeline arrives with the next pull request). Add `npm test` once the web tests land.
3. **Contract first**: change `contracts/ficha.schema.json`, then the pipeline and the web.
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
  - [ ] [#35](https://github.com/RikepilB/Data_corn/issues/35) Task 1 · Contract semantic validator · Must · M1
  - [ ] [#36](https://github.com/RikepilB/Data_corn/issues/36) Task 2 · Cached HTTP + NASA POWER adapter · Must · M1
  - [ ] [#37](https://github.com/RikepilB/Data_corn/issues/37) Task 3 · FAO-56 reference evapotranspiration · Must · M1
  - [ ] [#38](https://github.com/RikepilB/Data_corn/issues/38) Task 4 · SSURGO soil profile -> available water · Must · M2
  - [ ] [#39](https://github.com/RikepilB/Data_corn/issues/39) Task 5 · Crop parameters and site config · Must · M2
  - [ ] [#40](https://github.com/RikepilB/Data_corn/issues/40) Task 6 · Daily soil-water balance and campaign metrics · Must · M2
  - [ ] [#41](https://github.com/RikepilB/Data_corn/issues/41) Task 7 · Year types (dry / normal / wet) and corn planting window · Must · M1
  - [ ] [#42](https://github.com/RikepilB/Data_corn/issues/42) Task 8 · Rotation x year-type matrix with confidence · Must · M2
  - [ ] [#43](https://github.com/RikepilB/Data_corn/issues/43) Task 9 · `build_site_ficha` use case and CLI (first real ficha) · Must · M2
  - [ ] [#44](https://github.com/RikepilB/Data_corn/issues/44) Task 10 · AppEEARS loader + SMAP consistency check · Should · M3
  - [ ] [#45](https://github.com/RikepilB/Data_corn/issues/45) Task 11 · NDVI crop calendar and bare windows · Should · M3
  - [ ] [#46](https://github.com/RikepilB/Data_corn/issues/46) Task 12 · Relative erosion index · Should · M3
  - [ ] [#47](https://github.com/RikepilB/Data_corn/issues/47) Task 15 · GRACE regional water context · Should · M3
- [ ] [#7](https://github.com/RikepilB/Data_corn/issues/7) **EPIC 7 · Web (Astro) and Firebase Hosting**
  - [ ] [#48](https://github.com/RikepilB/Data_corn/issues/48) Task 13a · ficha types and helpers (Vitest) · Must · M1
  - [ ] [#49](https://github.com/RikepilB/Data_corn/issues/49) Task 13b · Tool page: planting strip, matrix, rotation cards · Must · M1
  - [ ] [#50](https://github.com/RikepilB/Data_corn/issues/50) Task 13c · Field map (MapLibre island) · Should · M3
  - [ ] [#51](https://github.com/RikepilB/Data_corn/issues/51) Task 13d · End-to-end smoke test (Playwright) · Must · M2
  - [ ] [#52](https://github.com/RikepilB/Data_corn/issues/52) Task 14a · Deploy v0 (synthetic example) to Firebase Hosting · Must · M1
  - [ ] [#53](https://github.com/RikepilB/Data_corn/issues/53) Task 14b · Redeploy with the real ficha and check public access · Must · M2
- [ ] [#8](https://github.com/RikepilB/Data_corn/issues/8) **EPIC 8 · UI/UX and brand**
  - [ ] [#54](https://github.com/RikepilB/Data_corn/issues/54) Decide the name and the tagline · Must · M1
  - [ ] [#55](https://github.com/RikepilB/Data_corn/issues/55) Design tokens, fonts and accessibility baseline · Must · M1
  - [ ] [#56](https://github.com/RikepilB/Data_corn/issues/56) Mobile-first wireframes for the tool page · Must · M1
  - [ ] [#57](https://github.com/RikepilB/Data_corn/issues/57) UX copy in plain English · Must · M2
  - [ ] [#58](https://github.com/RikepilB/Data_corn/issues/58) Outsider usability test on a phone (2 minutes) · Must · M4
- [ ] [#9](https://github.com/RikepilB/Data_corn/issues/9) **EPIC 9 · Storytelling and demo**
  - [ ] [#59](https://github.com/RikepilB/Data_corn/issues/59) Story outline: the orbital observer · Must · M2
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

[Apache-2.0](LICENSE). Third-party data and libraries keep their own licences, listed in [docs/REFERENCES.md](docs/REFERENCES.md).

Field Shift is a hackathon project. It is not affiliated with or endorsed by NASA or the USDA. NASA and USDA are named only as data sources.
