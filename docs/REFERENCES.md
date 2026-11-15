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
| EOxCloudless 2024 basemap (`tiles.maps.eox.at`, layer `s2cloudless-2024_3857`; product page `cloudless.eox.at`) | EOX IT Services GmbH, from Copernicus Sentinel data | Satellite basemap of the maps | Free for non-commercial use under CC BY-NC-SA 4.0; commercial use needs an EOX licence (read at cloudless.eox.at/documentation/license on 2026-11-15). Credit shown on the map, in the About panel and in the PDF, worded as that page asks: "EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024)" | used |

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
| Al-Kaisi, Elmore, Mallarino and others, [*Corn following corn: yield drag*](https://crops.extension.iastate.edu/encyclopedia/corn-following-corn-management), Integrated Crop Management, Iowa State University Extension (2008) | Iowa State University Extension | Evidence line on the "corn after corn" card: 2000 to 2007 plots, from almost the same to 27% less than corn after soybean, 14% on average. Read 2026-11-15 | Citation | used |
| Mallarino and Pecinovsky, [*Increasing the frequency of corn in crop sequences*](https://crops.extension.iastate.edu/encyclopedia/increasing-frequency-corn-crop-sequences-grain-yield-and-response-nitrogen-research), Iowa State University Extension | Iowa State University Extension | Evidence line on the "corn and soybean" card: Nashua, 1979 to 2004, +16 bu/acre on average, 0 to 40 by year. Read 2026-11-15 | Citation | used |
| [*Considerations for continuous corn*](https://crops.extension.iastate.edu/cropnews/2019/11/considerations-continuous-corn), Integrated Crop Management, Iowa State University Extension (2019) | Iowa State University Extension | "30 to 50 lb/acre more nitrogen" for continuous corn (benefits of the "corn and soybean" card, risks of "corn after corn"). Read 2026-11-15 | Citation | used |
| [*Life cycle*](https://cornrootworm.extension.iastate.edu/basics/life-cycle), Iowa State University corn rootworm site | Iowa State University Extension | Rootworm risk on the rotation cards: extended diapause of northern corn rootworm eggs (two or more winters) and the soybean variant of western corn rootworm. Read 2026-11-15 | Citation | used |
| Robertson and Acharya, [*Does planting green into a rye cover crop affect corn growth and yield?*](https://crops.extension.iastate.edu/post/does-planting-green-rye-cover-crop-affect-corn-growth-and-yield) (2021) | Iowa State University Extension | "Terminate a cereal rye cover 10 to 14 days before planting corn" (evidence line on the rye card). Read 2026-11-15 | Citation | used |
| Robertson and Licht, [*Terminating cover crops ahead of corn*](https://crops.extension.iastate.edu/post/terminating-cover-crops-ahead-corn), Iowa State University Extension with Precision Sustainable Ag | Iowa State University Extension | Corn planted green into rye yielded less at 10 of 13 sites in 2021, 11 of 14 in 2022 and 10 of 12 in 2023 (evidence and risks on the rye card). Read 2026-11-15 | Citation | used |
| Didan, K. (2021), *MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061*, NASA LP DAAC, [doi:10.5067/MODIS/MOD13Q1.061](https://doi.org/10.5067/MODIS/MOD13Q1.061) | NASA LP DAAC | NDVI at the pilot point, read through AppEEARS (first output 2026-11-15) | NASA open data policy (verify) | used |
| NASA JPL (2013), *NASA Shuttle Radar Topography Mission Global 1 arc second NetCDF*, NASA LP DAAC, [doi:10.5067/MEASURES/SRTM/SRTMGL1_NC.003](https://doi.org/10.5067/MEASURES/SRTM/SRTMGL1_NC.003) | NASA LP DAAC | Elevation at the pilot point, read through AppEEARS (first output 2026-11-15) | NASA open data policy (verify) | used |
| O'Neill, Chan, Njoku, Jackson, Bindlish, Chaubell and Colliander (2023), *SMAP Enhanced L3 Radiometer Global and Polar Grid Daily 9 km EASE-Grid Soil Moisture, Version 6*, NASA NSIDC DAAC, [doi:10.5067/M20OXIZHY3RJ](https://doi.org/10.5067/M20OXIZHY3RJ) | NASA NSIDC DAAC | SMAP soil moisture at the pilot point, read through AppEEARS (first output 2026-11-15) | NASA open data policy (verify) | used |
| AppEEARS Team (2026), *Application for Extracting and Exploring Analysis Ready Samples (AppEEARS)*, Ver. 3.137, NASA EOSDIS LP DAAC, USGS EROS Center, [appeears.earthdatacloud.nasa.gov](https://appeears.earthdatacloud.nasa.gov) | NASA LP DAAC / USGS | The tool that ran the point request | Citation | used |
| SoilGrids 2.0 (sand, clay, SOC), REST API `rest.isric.org` | ISRIC | Soil outside the US (Argentina, Brazil, Peru and the global profile) and the fallback in the US; inside the US the soil comes from SSURGO | CC BY 4.0 | used |
| Oceanic Niño Index (ONI), `www.cpc.ncep.noaa.gov` | NOAA CPC | ENSO phase chip on the verdict: the background of the season, not a forecast | U.S. Government work | used |
| Índice Costero El Niño (ICEN) | ENFEN / IGP (Peru) | not used after the pivot | — | not used |
| FAO-56: Allen, Pereira, Raes, Smith (1998), *Crop evapotranspiration*, FAO Irrigation and Drainage Paper 56 | FAO | Daily reference evapotranspiration (Penman-Monteith, eq. 6), Kc, p and root depth for the daily root-zone water balance | Citation | used |
| *Arquitectura Clean: principios y ejemplo práctico* (`createam.io/blog/arquitectura-clean.html`, Spanish) | CREATEAM | Reading shared by the team behind the layering rule in `docs/architecture/ARCHITECTURE.md` §3. No text or code copied | Citation | used |
| Saxton & Rawls (2006), *Soil water characteristic estimates by texture and organic matter*, SSSAJ 70:1569 | — | Available water from sand, clay and organic matter, only when SSURGO gives none and for SoilGrids soil | Citation | used (fallback) |
| Doorenbos & Kassam (1979), *Yield response to water*, FAO Irrigation and Drainage Paper 33 | FAO | Relative yield from the season's water shortfall from planting to maturity, with the seasonal yield-response factor Ky for maize (1.25); the per-stage Ky values are not used | Citation | used |
| Pope (2008), [*Calculating Degree Days*](https://crops.extension.iastate.edu/cropnews/2008/04/calculating-degree-days), Integrated Crop Management News, Iowa State University Extension | Iowa State University Extension | The 86/50 growing-degree-day method (base 10 °C, cap 30 °C): the article gives 50 °F and 86 °F as the minimum and maximum temperatures for corn development. Days from planting to emergence, silking and maturity (`phenology.py`). The degree days to maturity for each hybrid (`maize.yaml`) have no source yet. Read 2026-11-15 | Citation | used |
| FCC Census Area API (`geo.fcc.gov/api/census/area`) | U.S. Federal Communications Commission | State and county of a US field, no key | U.S. Government work (verify) | used |
| NASA Earth Observatory (2018-07-09), "Satellites Investigate Irrigation in a Stressed Aquifer", https://science.nasa.gov/earth/earth-observatory/satellites-investigate-irrigation-in-a-stressed-aquifer-92387/ | NASA Earth Observatory | Background for the project page and `docs/planning/PROBLEM.md`: the Ogallala (High Plains) aquifer is under stress; about 30 percent of the water once stored beneath Kansas is gone and 40 percent more could go within 50 years if trends continue. Read in full on 2026-11-15; facts only, no image | NASA content, cited as the source (verify the reuse terms) | used (text) |
| Liang, X.-Z., et al. (2024), "Dashboard for Agricultural Water Use and Nutrient Management (DAWN): A Predictive Decision Support System to Improve Crop Production in a Changing Climate", Bulletin of the American Meteorological Society 105(2): E432-E441, https://doi.org/10.1175/BAMS-D-22-0221.1 | American Meteorological Society (authors from US land-grant universities) | Prior art for the project page: a web dashboard for Corn Belt farmers built on seasonal forecasts and crop models, with accounts and extension partners. Read in full on 2026-11-15; facts only, no text copied | Citation | used (text) |
| Mourtzinis, S. & Conley, S. P. (2024), "Crop management recommendations: Agroptimizer decision support tool vs. local experts", Crop, Forage & Turfgrass Management 10(1), https://doi.org/10.1002/cft2.20277 | Wiley / ASA-CSSA (University of Wisconsin-Madison) | Prior art for the project page: a tool that recommends corn and soybean cropping systems, compared with University of Wisconsin experts. Abstract and the university's research summary read, not the full text | Citation | used (text) |
| USDA NASS QuickStats API (`quickstats.nass.usda.gov`) | USDA NASS | County corn-yield history for context. Needs a free key (`DATACORN_NASS_API_KEY`); without it the source is skipped | Public domain, U.S. Government work (verify) | used |
| OpenStreetMap Nominatim search (`nominatim.openstreetmap.org`) | OpenStreetMap Foundation | Place search box of the web app, low volume | ODbL, "© OpenStreetMap contributors". The Nominatim usage policy asks for a credit line next to the results; the search box shows it under its results, linked to `https://www.openstreetmap.org/copyright` | used |
| Google Map Tiles API, 2D satellite (`tile.googleapis.com`) | Google | Sharper satellite basemap, only when the build has `PUBLIC_GOOGLE_MAPS_KEY`; the credit line comes from the viewport endpoint | Google Maps Platform terms (verify) | used |
| McCool, Brown, Foster, Mutchler & Meyer (1987), *Revised slope steepness factor for the Universal Soil Loss Equation*, Transactions of the ASAE 30(5):1387-1396, doi:10.13031/2013.30576 | ASABE | Slope steepness factor S of the relative erosion index (`domain/agronomy/erosion.py`, #46) | Citation | planned |
| Renard et al. (1997; K. G. Renard, coordinating editor), *Predicting soil erosion by water: a guide to conservation planning with the Revised Universal Soil Loss Equation (RUSLE)*, USDA Agriculture Handbook 703, 384 pp. (title, year and pages from library catalogues and USDA ARS records; the ARS publication page is `ars.usda.gov/research/publications/publication/?seqNo115=92824`; no DOI) | USDA ARS | RUSLE structure behind the relative erosion index (K · S · cover · rain) | Citation; U.S. Government work (verify) | planned |
| Wischmeier & Smith (1978), *Predicting rainfall erosion losses: a guide to conservation planning*, USDA Agriculture Handbook 537 | USDA | Erosive-rain cutoff of 12.7 mm (0.5 in), applied to daily totals in the erosion index (#46). The 1.5 rain exponent and the default K of 0.03 are assumptions, not from a source | U.S. Government work | planned |

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
| tsx | Runs the local chat server (`npm run chat:dev`); not shipped | MIT | used |
| OpenRouter API (https://openrouter.ai) | Model access for the optional chat assistant; called from the server only, never from the browser | Service terms of OpenRouter and of the chosen model's provider | used when the chat is on |
| pandas, jsonschema, requests, earthaccess, Observable Plot | Earlier plan; none is in the dependency lists | — | not used |

## Fonts, images, music

| Asset | Source | Licence | Status |
|---|---|---|---|
| IBM Plex Mono (400, 500; Latin subset), self-hosted via Fontsource (`@fontsource/ibm-plex-mono` 5.3.0) | IBM; Fontsource | OFL-1.1 | used |
| Atkinson Hyperlegible Next (variable), self-hosted via Fontsource (`@fontsource-variable/atkinson-hyperlegible-next` 5.3.0) | Braille Institute; Fontsource | OFL-1.1 | used |
| `apps/web/public/og-image.jpg` (share image; screenshot of the app's Results step in sample-data mode, built on EOxCloudless 2024 basemap tiles and NASA GIBS imagery) | EOX IT Services GmbH, https://cloudless.eox.at (Contains modified Copernicus Sentinel data 2024); NASA GIBS | EOxCloudless: CC BY-NC-SA 4.0 per EOX (verify before reuse beyond this non-commercial hackathon entry); GIBS: NASA open data | used |
| Favicon (`apps/web/public/favicon.svg`) | Made in this repository; no outside artwork | Apache-2.0, as the repository | used |
| Music | None | — | — |

## Use of Super Intelligence (SI)

| Tool | What it did | Where labelled |
|---|---|---|
| Claude Code (Anthropic) | Repository scaffold, most of the code and tests, planning docs, issues, source summaries; credited in commits as Claude Fable 5.2, Opus 5.5, Sonnet 5.5 and Haiku 5.5 | README "Use of Super Intelligence (SI)", file headers, `Co-Authored-By` commit trailers, package descriptions |
| Chat assistant: a language model reached through OpenRouter (`OPENROUTER_MODEL`; default in `apps/web/server/chat/openrouter.ts`) | At run time, only when `PUBLIC_CHAT_ENABLED=true` and only on the real example report: explains that report's numbers, read through fixed lookup tools; computes no result ([#120](https://github.com/RikepilB/Data_corn/issues/120)) | The panel's notice "SI assistant, it can be wrong.", the About panel, README, file headers in `apps/web/server/chat/` and `apps/web/src/ui/chat/` |
| Codex (OpenAI) | Relative erosion index code and tests ([#46](https://github.com/RikepilB/Data_corn/issues/46)) | File header of `apps/api/src/datacorn/domain/agronomy/erosion.py`, README |
