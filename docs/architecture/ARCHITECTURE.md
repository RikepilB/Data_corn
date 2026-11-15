# Field Shift — Architecture

SI-assisted evaluation (Claude Code) of the team's proposal. Decisions marked **TEAM** are the
team's to make; everything else is a recommendation the team can overrule.

> **Pivot, 2026-11-14 afternoon (decision D7).** After the mentor session the team narrowed the
> scope to **corn, large and medium US producers, one state**. The decisions to support are
> **when to plant** and **at which stage water runs short**. Prior art is in
> [ANTECEDENTES-maiz-EEUU.es.md](../research/ANTECEDENTES-maiz-EEUU.es.md). Its key finding: the
> 2024 Galactic Impact winner already built planting-risk windows from SMAP + OpenET. So the
> product stays the **rotation comparison** the brief asks for. The planting window and the
> critical-stage water risk become columns of that comparison.

## 1. Spec: what the build must satisfy

Sources: the [official brief](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/)
(read 2026-11-14), the team proposal, the mentor pivot, and
[SUBMISSION-COMPLIANCE.md](../submission/SUBMISSION-COMPLIANCE.md).

| ID | Requirement | Source |
|---|---|---|
| R1 | Compare **at least three rotations, including the existing one** | brief |
| R2 | Per rotation: **why suggested, evidence, benefits, information gaps, risks needing local review** | brief |
| R3 | Combine NASA Earth observations with **local soil, crop characteristics and farmer priorities** (water use, forage, N-fixing, erosion, organic matter, market) | brief |
| R4 | Show **bare-field periods** and seasons when crops are vulnerable | brief |
| R5 | Water metrics per rotation: **water-stress days if not irrigated, irrigation demand, bare days**; erosion index (Should) | brief + proposal |
| R6 | Split outcomes by **dry / normal / wet years**: terciles of April–September precipitation over 1981–2025 | pivot (replaces ENSO, see §4) |
| R7 | **Corn planting window**: soil warm enough and frost passed. Led by the all-years band, because the year type is unknown in April; per-year-type rows are context | pivot ("when to plant") |
| R8 | **Corn critical-stage stress**: water-stress days around tasseling and silking (VT–R1) | pivot ("which stage runs short") |
| R9 | Say how the model treats **uncertainty** and where local expertise must validate | brief considerations |
| R10 | Farmer-interpretable, in US units (inches, °F, bu/ac, acres); supports, never replaces, farmer judgment | brief + pivot |
| R11 | Public, **no login**, English; ≥1 NASA dataset core to the solution; every source cited; SI labelled | rules |
| R12 | Working demo by **Sun 2026-11-15 20:00 PET** (hard close 23:59 PET) | rules |

The logic in one line: the **calendar** shows *where* there is room to change (the real rotation
and its bare windows). The **soil-water twin** shows *what would happen* (stress, irrigation,
bare soil). The **year type** shows *in which years* it pays off. The output is a
rotation × year-type matrix, plus the planting window: all years first, then by year type.

## 2. Stack evaluation

| Proposed | Verdict | Why |
|---|---|---|
| **Astro** | **Keep** | Static-first fits a precomputed demo. Islands give the map and matrix interactivity; the story page is plain content. Verified: the Astro 7.4.12 scaffold builds here. |
| **Firebase Hosting** | **Keep** | Free Spark plan, no card, public `*.web.app` URL, CDN. Meets "no login" by default. Project `field-shift-datacorn` already exists (see `docs/setup/ACCOUNTS.md`). |
| **Firebase Auth / Firestore** | **Cut** | The rules forbid gating judges behind a login, and the tool stores no user data (personal data is banned). |
| **Google Cloud (Cloud Run / Functions)** | **Defer** | Only needed for live analysis of any field. The Must path is one precomputed field. The $300 trial is already used on Richard's account. |
| **Google Earth Engine** | **Optional** | **AppEEARS** (NASA, Earthdata Login) returns SMAP + MODIS point series in one request and strengthens *Relevance*. |
| **"Clean architecture: fixtures, fichas"** | **Keep, light** | *Fichas* = one precomputed JSON per field following `contracts/ficha.schema.json` (now v0.2.0). *Fixtures* = recorded API responses, so tests and the demo run offline. Layers: `adapters → domain → usecases`. No DI framework. |
| Language split | **Python for all science; TypeScript for presentation only** | One implementation of the model. The web converts SI to US units for display; that is formatting, not science. |
| Map / charts | **MapLibre GL JS + Observable Plot** | No API key or billing; free basemaps. |

## 3. System design

```mermaid
flowchart LR
  subgraph Sources
    POWER[NASA POWER daily 1981-2025: weather, TSOIL1, GWETTOP]
    APP[AppEEARS: SMAP SPL3SMP_E + MODIS MOD13Q1 + SRTM]
    SSURGO[USDA SSURGO via Soil Data Access]
    CSB[USDA NASS Crop Sequence Boundaries: current rotation, read once]
    GRACE[GRACE / GRACE-FO: regional water storage, context only]
  end
  subgraph pipeline [pipeline/ - Python]
    AD[adapters: fetch + cache + fixtures]
    DOM[domain: ET0, water balance, year types, planting window, phenology, erosion]
    UC[usecases: build_site_ficha]
  end
  Sources --> AD --> DOM --> UC
  UC -->|validated against contracts/ficha.schema.json| F[(web/public/data/fichas/site.json)]
  F --> WEB[web/ - Astro: story + tool]
  WEB --> HOST[Firebase Hosting, public]
```

**Per-field run** (offline, takes minutes):

1. Fetch POWER, cache it in `data/raw/`, and compute daily ET0.
2. For each rotation, run the daily soil-water balance over 1981–2025 twice: **rainfed** and **full irrigation**.
3. Compute per crop year:
   - from the rainfed run: water-stress days, and corn critical-window stress days;
   - from the irrigated run: irrigation demand (mm → m³/ha);
   - bare days.
4. Classify each crop year as dry, normal or wet.
5. Compute p10/p50/p90 per cell, plus a confidence level.
6. Compute the planting window from POWER soil temperature and Tmin, for all years and per year type.
7. Write the ficha and copy it into `web/public/data/fichas/`.

**Crop year** Y = 1 September Y−1 → 31 August Y, labelled by the summer season it contains. A
crop belongs to the crop year in which it is planted. So winter wheat planted in October Y−1 and
the cereal rye cover that precedes corn Y both fall in Y. Corn, soybean and sorghum harvested in
Sep–Oct Y also stay in Y.

**Common analysis grid (brief consideration):** the field point, at a daily step. Coarser
products are sampled at the point and labelled with their native resolution:

| Product | Native resolution |
|---|---|
| POWER (weather; TSOIL1 and GWETTOP come from MERRA-2) | ~0.5° |
| SMAP | 9 km |
| MODIS | 250 m |
| GRACE | ~300 km footprint |

Nothing is presented as field-scale ground truth.

### Layering rule (enforced by a test)

Dependencies point inward: the science stays pure and testable, all I/O sits at the edge, and the
web only renders. The code is in `apps/api/src/datacorn/`. (The diagram above still uses the
original plan's names: `pipeline/` is `apps/api/`, `adapters` is `infrastructure/`, `usecases` is
`application/use_cases/` and `web/` is `apps/web/`.)

| Layer | What it holds | Imports from `datacorn` |
|---|---|---|
| `domain/` | Pure FAO-56 and statistics: ET0, water balance, phenology, rotation scenarios, zones, the report. Its types are frozen dataclasses. No network, no files | Only itself |
| `application/` | The ports (`ports.py`) the domain needs from the outside, and the use cases that orchestrate the domain and build the report | `domain` |
| `infrastructure/` | Every adapter that does I/O: NASA POWER, SSURGO, CropScape, NASS, SoilGrids, NOAA ONI, Earth Engine, the HTTP client and the cache | `domain`, `application`, `config` |
| `interfaces/` | The FastAPI routes and schemas: validate the input, call a use case, return the report | `application`, `domain`, `bootstrap` |
| `bootstrap.py` | The composition root: the only place that wires adapters into use cases | All layers |
| `apps/web/` | Renders the report | — |

`apps/api/tests/unit/test_architecture.py` parses every import with `ast` and fails when:

- `domain/` imports `application`, `infrastructure`, `interfaces`, `bootstrap` or `config`; or an
  HTTP, Earth Engine, Google, Pydantic or YAML library; or a network or file-system module
  (`urllib`, `socket`, `pathlib`, `os` and similar).
- `application/` imports `infrastructure`, `interfaces` or `bootstrap`, or FastAPI, `httpx`, Earth
  Engine or Google.
- A dataclass in `domain/` or `application/` is not declared with `frozen=True`.

Relative imports (`from ..infrastructure import http`) and submodules imported by name
(`from datacorn import infrastructure`) are resolved to absolute names, so they count too. To add
a rule, edit `FORBIDDEN` in that file. Run it with
`cd apps/api && uv run --extra dev pytest tests/unit/test_architecture.py`.

Not covered by the test, so kept by review:

- `interfaces/` does not import `infrastructure/`. It gets its use cases from the container that
  `bootstrap.py` builds.
- `apps/web/` may format numbers and convert units, but every scientific value (stress days, yield
  range, irrigation need) comes from the report, never from a calculation in the browser.

Further reading (Spanish): [Arquitectura Clean: principios y ejemplo práctico](https://createam.io/blog/arquitectura-clean.html).

## 4. Science notes (what we may and may not claim)

- **Year types, not ENSO.**
  - Why not ENSO: its summer signal over the central US is weak and inconsistent (to confirm with the mentor).
  - What we do instead: a tercile split of April–September POWER precipitation gives 15 dry, 15 normal and 15 wet crop years over 1981–2025.
  - Why it helps: it is easy to explain ("in the driest third of years…") and every cell keeps enough years.
  - Crop years missing more than 5 % of their season's daily values are left unclassified, not guessed.
- **Stress is exposure, not management.**
  - Stress metrics come from the **rainfed** run: what the crop would face without irrigation.
  - Irrigation demand comes from the **full-irrigation** run.
  - So the irrigated baseline does not show 0 stress, and alternatives compare on the same footing.
  - The `irrigated` flag on a rotation only drives the narrative.
- **Critical stage.**
  - Window: 21 days, from 7 days before to 14 days after the start of the FAO-56 mid-season stage. For maize this is about tasseling and silking; check the FAO-56 text.
  - It is computed only in years when the rotation grows corn. A corn–soybean rotation therefore has about 7 corn years per year type, not 15. `n_corn_years` is reported, and the band is `null` when there are none.
  - Per-day yield-loss figures (up to 9 %/day at silking; Iowa State, UW, from Claassen & Shaw 1970) appear only as cited **ranges**, never as a predicted loss.
  - A GDD-based silking date is a Should, and only with a cited GDD-to-silking figure.
- **Planting window.**
  - Rule: the first day on or after 1 April when the 5-day mean of POWER `TSOIL1` is ≥ 10 °C (50 °F) and Tmin stays > 0 °C for the next 7 days.
  - This approximates the extension rule of 2-inch soil temperature ≥ 50 °F with no freeze in the forecast (Penn State, K-State).
  - `TSOIL1` is the MERRA-2 top soil layer at ~0.5°, not a 2-inch probe. That is listed as an information gap.
- **SMAP check = consistency, not validation.**
  - It compares monthly anomalies of the simulated **rainfed** root-zone moisture with SMAP at the 9 km pixel, for 2015–2025.
  - In western Kansas that pixel mixes irrigated center pivots and dryland, which adds noise. The note says so.
  - It never validates the alternative rotations. SMAP L3 senses ~0–5 cm, so compare anomalies, never absolutes.
- **GRACE is context.**
  - It shows the regional groundwater and total water storage trend: why water matters here.
  - It is ~300 km wide and cannot speak about one field or one well.
- **Scenarios, not forecasts.** "In a dry year" means: look at the dry column. It does not predict next season.
- **Erosion** is a relative, RUSLE-style index for comparing rotations at one field, never tonnes per hectare.
- **Crop parameters** (Kc, p, root depth, stage lengths) come from FAO-56 tables until a local agronomist corrects them; the ficha lists that as an information gap. Cereal rye has no FAO-56 row, so it uses winter-wheat values and says so.
- **Soil** comes from SSURGO (USDA NRCS Soil Data Access).
  - TAW = `awc_r` × 1000, depth-weighted over the root zone and weighted by component percentage.
  - The western Kansas probe gave Keith silt loam with `awc_r` 0.21 → ~210 mm/m.
  - Saxton & Rawls stays as a cross-check only.

## 5. Pilot field (TEAM decision 1)

| Option | Strength | Weakness |
|---|---|---|
| **A. Western Kansas, GMD4 (Sheridan County, Sheridan-6 LEMA)** | Real water scarcity: the southern Ogallala is declining and GRACE shows it. OpenET is used in Kansas. Strong local evidence: the LEMA cut pumping 23 % with about −1 % corn yield (self-reported). Sorghum and wheat rotations exist | GRACE is coarse; irrigated and dryland mix in the SMAP pixel |
| B. Central Iowa | Largest corn state, rainfed, the 2012 flash drought, strong rotation evidence | Iowa State FACTS already covers in-season forecasts; the water-scarcity story is weaker |
| C. Nebraska | Most irrigated state | NavePlant, which came out of Space Apps 2024, is Nebraska-based: crowded topic |

**Recommendation: A.** The SSURGO probe at 39.36 N, −100.44 W returned Keith silt loam, 1–3 %
slopes. The current rotation is read once from Crop Sequence Boundaries, by hand, for the chosen
field. Confirm with the mentor before locking it.

Candidate rotations (TEAM decision 2, to be reviewed by the mentor or an agronomist):

1. **Current:** continuous corn, irrigated.
2. Corn → soybean.
3. Corn → cereal rye cover → soybean.
4. Wheat → corn → sorghum → fallow, dryland.

A *limited-irrigation* variant is added only if `simulate` gains an irrigation cap backed by a
cited allocation. We do not invent a LEMA number.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Pivot arrives with ~30 h left | Reuse the FAO-56 engine and the contract. The pivot changes the site, the climate split and two metrics, not the architecture |
| A judge recalls the 2024 planting-window winner | Open with the rotation comparison and the Ogallala water story; the planting window is one column |
| The irrigated baseline shows 0 stress | Stress always comes from the rainfed run (§4) |
| Few corn years in the dryland rotation | Report `n_corn_years`; low confidence; `null`, never 0 |
| AppEEARS queue takes hours | Submit the point request early; the POWER-only twin runs without it |
| Intermittent TLS resets on this machine (`WinError 10054`) | Retry with backoff; cache every response in `data/raw/`; commit small fixtures |
| Soil Data Access slow or down | Cache; fall back to a typed texture class, labelled as assumed |
| Scope creep (any field, OpenET API, GDD model) | Cut lines in the team plan: one precomputed field first |

## 7. Decision log

| # | Decision | Status |
|---|---|---|
| D1 | Precomputed static fichas; no backend on the Must path | proposed |
| D2 | No Auth / no database | proposed (rule-driven) |
| D3 | Python owns all science; web only renders (and formats units) | proposed |
| D4 | AppEEARS for SMAP + MODIS point series; GEE optional | proposed |
| D5 | Pilot field | **TEAM** (recommended: western Kansas, GMD4) |
| D6 | Rotations to compare (≥3 incl. current) | **TEAM**, reviewed by mentor/agronomist |
| D7 | Pivot: corn, US state, planting window + critical-stage stress as matrix columns; dry/normal/wet years replace ENSO; SSURGO replaces SoilGrids; contract v0.2.0 | decided after mentor session; year-type split to confirm with mentor |
