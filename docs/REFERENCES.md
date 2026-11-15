# References & licences

Space Apps requires every source (data, code, text, images, fonts, music) to be cited, with
third-party licences documented. Missing citations can cost a nomination. **Add a row the
moment you use something.** "Verify" means nobody has read the licence page yet; clear it
before submitting.

Owner: Hildemaro (proposed). Status values: `planned` → `used` → `verified`.

`python scripts/compliance_audit.py` checks that every runtime library and every data, tile and
font host in the code is named here. Library licences below come from the installed package
metadata (2026-11-15); that is not the same as `verified`.

## NASA data (≥1 required for Global Awards)

| Dataset | Product ID / version | Provider | Use in Field Shift | Licence / terms | Status |
|---|---|---|---|---|---|
| NASA POWER daily, AG community (`power.larc.nasa.gov`) | `T2M_MAX, T2M_MIN, PRECTOTCORR, ALLSKY_SFC_SW_DWN, RH2M, WS2M, GWETROOT, GWETTOP` | NASA LaRC (GWETROOT/GWETTOP from MERRA-2, ~0.5°) | Climate forcing 1981–2025, ET0, year types (Apr–Sep rain), soil wetness for the moisture series. The planting window is simulated from this forcing; soil temperature (`TSOIL1`) is not requested | NASA open data policy (verify) | used |
| GRACE / GRACE-FO JPL mascon | `TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4` (verify short name) | PO.DAAC | Regional water-storage trend as context (Should); never per field | NASA open data policy (verify) | planned |
| OpenET | ensemble v2.0, monthly, 30 m (Landsat-based); Earth Engine asset `projects/openet/assets/ensemble/conus/gridmet/monthly/v2_0`, 1999-10 to 2024-12 | OpenET consortium (NASA, Google, others) | Observed monthly ET of an irrigated field. Adapter written 2026-11-15, runs only with Earth Engine enabled, not run yet; the comparison with the model is not built | verify | planned |
| SMAP Enhanced L3 radiometer soil moisture | `SPL3SMP_E` v006, 9 km | NSIDC DAAC | Consistency check of simulated moisture anomalies, 2015–2025 | NASA open data policy (verify) | planned |
| GPM IMERG Final daily | `GPM_3IMERGDF` V07 | GES DISC | Rainfall cross-check, erosivity, 2000–2025 | NASA open data policy (verify) | planned |
| MODIS Vegetation Indices 16-day | `MOD13Q1` v061, 250 m | LP DAAC, read through the ORNL DAAC web service (`modis.ornl.gov`, no key) | NDVI crop calendar and bare windows, 2000– | NASA open data policy (verify) | used |
| SRTM | `SRTMGL1` v003, 30 m | LP DAAC | Slope for the erosion index | NASA open data policy (verify) | planned |
| HLS (Landsat + Sentinel-2) | `HLSL30` / `HLSS30` v2.0 (Earth Engine `NASA/HLS/HLSL30/v002`, `NASA/HLS/HLSS30/v002`) | LP DAAC | Field NDVI at 30 m for the season-progress card. Adapter written 2026-11-15, runs only with Earth Engine enabled, not run yet | NASA open data policy (verify) | planned |
| SMAP L4 surface and root-zone soil moisture, 3-hourly, 9 km | `SPL4SMGP` v008 (Earth Engine `NASA/SMAP/SPL4SMGP/008`), from 2015-03-31 | NSIDC DAAC, NASA GMAO | Root-zone wetness of the field, and the drought layer (root-zone percentile, `GET /api/v1/layers/drought/tiles`). Written 2026-11-15, runs only with Earth Engine enabled, not run yet | NASA open data policy (verify) | planned |
| NASADEM | `NASADEM_HGT` v001, 30 m (Earth Engine `NASA/NASADEM_HGT/001`) | LP DAAC | Field elevation, mean slope and share of low spots. Adapter written 2026-11-15, runs only with Earth Engine enabled, not run yet | NASA open data policy (verify) | planned |
| AppEEARS | service | LP DAAC | Point extraction of SMAP + MODIS | NASA (verify) | planned |
| NLDAS-2 hourly forcing | `NASA/NLDAS/FORA0125_H002` (Earth Engine), 1/8 degree | NASA GES DISC | Registered stub (`NldasSoilMoisture`): the product holds forcing fields and no soil moisture, so it always raises `DataUnavailable`; no region profile lists it | NASA open data policy (verify) | not used |
| ECOSTRESS evapotranspiration | ECOSTRESS ET, 70 m, through AppEEARS (not in the Earth Engine catalogue) | LP DAAC | Stub (`ecostress.py`, raises `NotImplementedError`); not called | NASA open data policy (verify) | not used |
| NASA GIBS map tiles (WMTS, `gibs.earthdata.nasa.gov`) | `BlueMarble_ShadedRelief_Bathymetry`, `SMAP_L4_Analyzed_Root_Zone_Soil_Moisture`, `IMERG_Precipitation_Rate`, `MODIS_Terra_L3_Land_Surface_Temp_Monthly_Day`, `MODIS_Terra_L3_NDVI_Monthly` | NASA ESDIS Project (GIBS) | The globe and the map layers: root-zone soil moisture, rain, heat and vegetation | NASA open data policy (verify) | used |

## Space agency partner data

| Dataset | Provider | Use | Licence / attribution | Status |
|---|---|---|---|---|
| Copernicus Sentinel-2 L2A (Earth Engine `COPERNICUS/S2_SR_HARMONIZED`) | ESA / Copernicus | In-field zones at 10 m: median peak-season NDVI of several seasons, each pixel against the field's own median. Adapter written 2026-11-15, runs only with Earth Engine enabled, not run yet | Copernicus licence; attribution "Contains modified Copernicus Sentinel data [year]" (verify) | planned |
| Sentinel-2 cloudless 2024 basemap (`tiles.maps.eox.at`, layer `s2cloudless-2024_3857`) | EOX IT Services GmbH, from Copernicus Sentinel data | Satellite basemap of the maps | Credit shown on the map: "Sentinel-2 cloudless 2024 by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024)"; EOX terms not read yet (verify) | used |

## Other data and methods

| Source | Provider | Use | Licence | Status |
|---|---|---|---|---|
| USDA NRCS SSURGO via Soil Data Access (`SDMDataAccess.sc.egov.usda.gov`) | USDA NRCS | Soil horizons (`awc_r`, sand, clay, OM) → available water for the field | Public domain, U.S. Government work (verify) | used |
| PRISM daily, 4 km (Earth Engine `OREGONSTATE/PRISM/ANd`; `AN81d` is deprecated) | PRISM Climate Group, Oregon State University | Daily temperature and rain for US fields, merged with NASA POWER radiation, humidity and wind. Adapter written 2026-11-15, runs only with Earth Engine enabled, not run yet | verify | planned |
| ERA5-Land daily aggregates, about 11 km (Earth Engine `ECMWF/ERA5_LAND/DAILY_AGGR`) | ECMWF / Copernicus Climate Change Service | Global backup climate after NASA POWER. Adapter written 2026-11-15, not run yet | Copernicus licence (verify) | planned |
| USDA NASS Cropland Data Layer (Earth Engine `USDA/NASS/CDL`) | USDA NASS | Crop of each year from all pixels of the field, in one request (Earth Engine adapter, written 2026-11-15, not run yet). The API runs today on CropScape (`nassgeodata.gmu.edu`, no account) | Public domain, U.S. Government work (verify) | used |
| Cloud Score+ for Sentinel-2 (Earth Engine `GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED`) | Google | Cloud mask for the in-field zones | verify | planned |
| TIGER/Line 2018 counties (Earth Engine `TIGER/2018/Counties`) | U.S. Census Bureau | Registered stub (`TigerCounties`, raises `NotImplementedError`); the county comes from the FCC API | U.S. Government work (verify) | not used |
| FAO GAUL 2015 level 2 (Earth Engine `FAO/GAUL/2015/level2`) | FAO | Registered stub (`GaulAdmin`, `GaulCountryLocator`; raise `NotImplementedError`); no region profile lists it | verify (FAO terms) | not used |
| Google Earth Engine | Google | Runs the queries above through the `earthengine-api` client (sign-in scope on `www.googleapis.com`). Needs a Cloud project registered for noncommercial use | Earth Engine terms of service (verify) | planned |
| USDA NASS Crop Sequence Boundaries (CSB) | USDA NASS + ERS | Current rotation of the pilot field (read once by hand) | Public domain, provided "as is" (verify) | planned |
| Penn State and K-State Extension planting guidance (2-inch soil ≥ 50 °F, no freeze in forecast) | Penn State / Kansas State University | Background for the planting window. The app does not apply this soil-temperature rule: it simulates the window with the FAO-56 water balance and growing degree days (`docs/DATA-SOURCES.md` section 4) | Citation | not used |
| Iowa State / UW Extension, corn drought yield loss by stage (Claassen & Shaw 1970; Shaw 1988) | ISU / UW | Cited ranges for critical-stage stress (never a prediction) | Citation | planned |
| SoilGrids 2.0 (sand, clay, SOC), REST API `rest.isric.org` | ISRIC | Soil outside the US (Argentina, Brazil, Peru and the global profile) and the fallback in the US; inside the US the soil comes from SSURGO | CC BY 4.0 | used |
| Oceanic Niño Index (ONI), `www.cpc.ncep.noaa.gov` | NOAA CPC | ENSO phase chip on the verdict: the background of the season, not a forecast | U.S. Government work | used |
| Índice Costero El Niño (ICEN) | ENFEN / IGP (Peru) | not used after the pivot | — | not used |
| FAO-56: Allen, Pereira, Raes, Smith (1998), *Crop evapotranspiration*, FAO Irrigation and Drainage Paper 56 | FAO | ET0 equation, Kc, p, root depth tables | Citation | planned |
| Saxton & Rawls (2006), *Soil water characteristic estimates by texture and organic matter*, SSSAJ 70:1569 | — | Pedotransfer for field capacity / wilting point | Citation | planned |
| FCC Census Area API (`geo.fcc.gov/api/census/area`) | U.S. Federal Communications Commission | State and county of a US field, no key | U.S. Government work (verify) | used |
| USDA NASS QuickStats API (`quickstats.nass.usda.gov`) | USDA NASS | County corn-yield history for context. Needs a free key (`DATACORN_NASS_API_KEY`); without it the source is skipped | Public domain, U.S. Government work (verify) | used |
| OpenStreetMap Nominatim search (`nominatim.openstreetmap.org`) | OpenStreetMap Foundation | Place search box of the web app, low volume | ODbL, "© OpenStreetMap contributors". The Nominatim usage policy asks for a credit line next to the results; the app does not show one yet (verify) | used |
| Google Map Tiles API, 2D satellite (`tile.googleapis.com`) | Google | Sharper satellite basemap, only when the build has `PUBLIC_GOOGLE_MAPS_KEY`; the credit line comes from the viewport endpoint | Google Maps Platform terms (verify) | used |

## Code libraries

| Library | Used for | Licence | Status |
|---|---|---|---|
| Astro, @astrojs/react | Web app shell and React islands | MIT | used |
| React, react-dom | Web UI | MIT | used |
| MapLibre GL JS (`maplibre-gl`) | Globe and field maps | BSD-3-Clause | used |
| @react-pdf/renderer | PDF report made in the browser | MIT | used |
| FastAPI | API framework | MIT | used |
| Uvicorn | Serves the API (Dockerfile) | BSD-3-Clause | used |
| Pydantic, pydantic-settings | API schemas and `DATACORN_` settings | MIT | used |
| httpx | HTTP client of the data adapters | BSD-3-Clause | used |
| SciPy | Savitzky-Golay smoothing of the NDVI series | BSD-3-Clause | used |
| NumPy | Pinned dependency of SciPy | BSD-3-Clause (the wheel bundles 0BSD, MIT, Zlib and CC0-1.0 parts) | used |
| PyYAML | Region profiles and crop catalogue | MIT | used |
| earthengine-api | Earth Engine adapters (written, not run yet) | Apache-2.0 | used |
| google-cloud-storage | Optional GCS cache | Apache-2.0 | used |
| pytest, ruff, Vitest, Playwright, TypeScript, @astrojs/check | Tests and checks; not shipped | MIT, Apache-2.0 | used |
| pandas, jsonschema, requests, earthaccess, Observable Plot | Earlier plan; none is in the dependency lists | — | not used |

## Fonts, images, music

| Asset | Source | Licence | Status |
|---|---|---|---|
| IBM Plex Sans and IBM Plex Mono (weights 400, 500, 600) | Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`), linked from `apps/web/src/layouts/BaseLayout.astro` | SIL Open Font License 1.1 (verify) | used |
| Favicon (`apps/web/public/favicon.svg`) | Made in this repository; no outside artwork | Apache-2.0, as the repository | used |
| Music | None | — | — |

## Use of Super Intelligence (SI)

| Tool | What it did | Where labelled |
|---|---|---|
| Claude Code (Anthropic) | Repository scaffold, contract draft, planning docs, code assistance | README, file headers |
