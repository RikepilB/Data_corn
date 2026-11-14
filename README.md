# Data Corn

Decision support for medium and large corn growers, built on NASA Earth observations.
NASA Space Apps Challenge 2026 — *Field Shift: Adapting Farms with NASA Data*.

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

> Data Corn supports — it does not replace — farmer judgment and local agronomic expertise.

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

- **Tests:** 29 tests cover the domain math, the use cases end to end with fakes, the clean-architecture dependency rule and the API.
- **Timing on the sample field:**
  - closing the field (`describe`) takes about 9 s;
  - results (`analyze`) take under 1 s;
  - a past or current season adds the MODIS NDVI download, about 1 minute.

## Pending tasks

### Needs accounts
- [ ] New Google Cloud project ($300 trial), deployed with Cloud Run (API) and Firebase Hosting (web). See [infra/README.md](infra/README.md).
- [ ] Register the project for Earth Engine. That unlocks the in-field zones (Sentinel-2 / HLS), the drought anomaly layer, and PRISM, SMAP and OpenET for validation. The adapters are already stubbed in `apps/api/src/datacorn/infrastructure/earthengine/`.
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

Web (Node 22.23.4+):

```bash
cd apps/web
npm install
npm run dev        # http://localhost:4321, proxies /api to localhost:8080
```

Open `http://localhost:4321/?mock=1` to try the screen with sample data and no API.

## License

Apache License 2.0 — see [LICENSE](LICENSE).
