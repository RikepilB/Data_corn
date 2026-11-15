<!-- SI-assisted (Claude Code); reviewed by <name> -->
# Data Corn

> Guide to the Data Corn project skeleton (`apps/` and `infra/`). The repository README, which describes Field Shift as a whole, is [../README.md](../README.md). Commands in this file run from the repository root. The text below is the skeleton's original README as it was on `main` at commit `9f68c43`; only its relative links were adjusted.

Decision support for medium and large corn growers, built on NASA Earth observations.
NASA Space Apps Challenge 2026 — *Field Shift: Adapting Farms with NASA Data*.

"Google Earth for corn":
- Start on a 3D globe with NASA climate layers: drought, rain, heat and vegetation, on a time slider.
- Fly to your location, tap the corners of your field and enter a few field facts.
- Get one simple screen that both the farm manager and the agronomist can read:
  - an animated **season film** over the map;
  - **25-season climate stripes** for that field;
  - six key cards: planting window, water at flowering, heat at flowering, hybrid fit and frost,
    irrigation or waterlogging, and corn-after-corn vs. corn-after-soybean.
- The full report downloads as a PDF.

The first region is the United States (demo state: Nebraska). The architecture is built so that
new countries (Peru, Brazil, Argentina, …) are added with a region profile, without changing the
domain or the screen.

> Data Corn supports — it does not replace — farmer judgment and local agronomic expertise.

## Repository layout

| Path | What |
|---|---|
| `apps/api/` | Python 3.12 + FastAPI backend (Cloud Run), clean architecture |
| `apps/web/` | Astro + React frontend (single screen) |
| `docs/` | Challenge text, flow, screen, requirements and architecture (team docs in Spanish) |
| `infra/` | Deployment notes: Cloud Run, Firebase Hosting, budget |

See [docs/arquitectura.md](../docs/arquitectura.md) for the architecture and
[docs/requerimientos.md](../docs/requerimientos.md) for functional and non-functional requirements.

## Status

The API runs the engine: `POST /api/v1/fields/analyze` returns a field report, and `/describe`, `/health`, `/regions`, `/demo-fields` and the layer routes work. Some adapters are still stubs that raise `NotImplementedError`, which the API turns into a `501` (for example the Earth Engine admin lookups); the data sources and their status are listed in [docs/REFERENCES.md](../docs/REFERENCES.md).
- **Tests:** engine and web tests run with `pytest` (`apps/api`) and `pnpm test` (`apps/web`).

## Pending tasks

### Accounts and setup
- [ ] New Google Cloud project ($300 trial) registered for Earth Engine (non-commercial use)
- [ ] Cloud Run service account with Earth Engine access, and a Cloud Storage bucket for the cache
- [ ] USDA NASS QuickStats API key, stored in Secret Manager
- [ ] Firebase project linked to the Google Cloud project, and a budget alert
- [ ] Deployment steps: [infra/README.md](../infra/README.md)

### Build steps (details in [docs/requerimientos.md](../docs/requerimientos.md))
- [ ] **F0 Base:** deploy the API (`/health`) on Cloud Run and the web app with the globe on Firebase Hosting
- [ ] **F1 Field:** fly to my location on the globe, draw the field point by point (Terra Draw), validate the polygon, detect region and county
- [ ] **F2 Field data:** SSURGO soil, NASADEM terrain, CDL crop history, NASS county yields and typical planting date
- [ ] **F3 Weather and phenology:** daily history (PRISM + NASA POWER), growing degree days, season scenarios, frost
- [ ] **F4 Soil-water twin:** FAO-56 water balance validated with SMAP, planting window, irrigation need (OpenET check)
- [ ] **F5 Satellite and layers:** heat at flowering, NDVI season progress, waterlogging, climate layers on the map (NASA GIBS + Earth Engine drought anomaly)
- [ ] **F6 El Niño / La Niña:** effect measured on each field's history (NOAA ONI)
- [ ] **F7 Rotation:** corn after corn vs. corn after soybean, relative yield vs. county
- [ ] **F8 Screen:** step flow (globe → draw → calculating → form → results), season film, 25-season stripes, 6 key cards, ES/EN, imperial/metric, PDF report
- [ ] **F9 Demo and submission:** precomputed sample fields (Nebraska, Iowa, Illinois, Kansas)

### To verify before F3–F5
- [ ] Earth Engine dataset IDs marked `verificar` in the adapters (PRISM daily, SMAP L4 version, NLDAS, OpenET)
- [ ] Corn parameters marked `verificar` in `apps/api/src/datacorn/resources/crops/maize.yaml`
- [ ] NASA GIBS layer IDs and tile matrix sets; EOX basemap license (non-commercial)

### Code alignment with the latest design
- [ ] The web skeleton still uses the earlier two-column layout: rebuild it as the step flow (F1/F8)
- [ ] Add the daily season-film series and the per-year stripes to the report model (F8)
- [ ] Add the `/api/v1/layers` endpoints (F5)

### Space Apps submission
- [ ] Demo: video of 30 s or less with English subtitles, or 7 slides or fewer, in English
- [ ] Project page in English, every dataset cited, AI use declared
- [ ] Submit before Sunday, November 15, 2026, 23:59 local time

### Later: more countries
- [ ] Peru: ICEN (coastal El Niño), MapBiomas Peru, MIDAGRI
- [ ] Brazil: MapBiomas Brazil, CONAB / IBGE
- [ ] Argentina: MapBiomas Argentina, MAGyP

## Run locally

API (Python 3.12+):

```bash
cd apps/api
python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn datacorn.main:app --reload --port 8080
pytest
```

Web (Node 22.23.4+):

```bash
cd apps/web
npm install
npm run dev        # http://localhost:4321, proxies /api to localhost:8080
```

## Data sources

NASA: POWER, GPM IMERG, SMAP, HLS (Landsat/Sentinel-2), MODIS, NASADEM (SRTM), ECOSTRESS.
Partners and others: ESA Copernicus Sentinel-2, ECMWF ERA5-Land, USDA NASS Cropland Data Layer,
USDA NRCS SSURGO, PRISM, NLDAS, OpenET, USDA NASS QuickStats, USGS NWIS, NOAA CPC ONI, ISRIC
SoilGrids. Full citations are shown in the app (sources panel).

## License

Apache License 2.0 — see [LICENSE](../LICENSE).
