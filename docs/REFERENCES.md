# References & licences

Space Apps requires every source (data, code, text, images, fonts, music) to be cited, with
third-party licences documented. Missing citations can cost a nomination. **Add a row the
moment you use something.** "Verify" means nobody has read the licence page yet; clear it
before submitting.

Owner: Hildemaro (proposed). Status values: `planned` → `used` → `verified`.

## NASA data (≥1 required for Global Awards)

| Dataset | Product ID / version | Provider | Use in Field Shift | Licence / terms | Status |
|---|---|---|---|---|---|
| NASA POWER daily, AG community | `T2M_MAX, T2M_MIN, RH2M, WS2M, ALLSKY_SFC_SW_DWN, PRECTOTCORR, TSOIL1, GWETTOP` | NASA LaRC (TSOIL1/GWETTOP from MERRA-2, ~0.5°) | Climate forcing 1981–2025, ET0, year types (Apr–Sep rain), planting window (soil temperature, frost) | NASA open data policy (verify) | planned |
| GRACE / GRACE-FO JPL mascon | `TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4` (verify short name) | PO.DAAC | Regional water-storage trend as context (Should); never per field | NASA open data policy (verify) | planned |
| OpenET | ensemble v2.0, monthly, 30 m (Landsat-based); Earth Engine asset `projects/openet/assets/ensemble/conus/gridmet/monthly/v2_0`, 1999-10 to 2024-12 | OpenET consortium (NASA, Google, others) | Observed monthly ET of an irrigated field. Adapter written 2026-11-15, runs only with Earth Engine enabled, not run yet; the comparison with the model is not built | verify | planned |
| SMAP Enhanced L3 radiometer soil moisture | `SPL3SMP_E` v006, 9 km | NSIDC DAAC | Consistency check of simulated moisture anomalies, 2015–2025 | NASA open data policy (verify) | planned |
| GPM IMERG Final daily | `GPM_3IMERGDF` V07 | GES DISC | Rainfall cross-check, erosivity, 2000–2025 | NASA open data policy (verify) | planned |
| MODIS Vegetation Indices 16-day | `MOD13Q1` v061, 250 m | LP DAAC | NDVI crop calendar and bare windows, 2000– | NASA open data policy (verify) | planned |
| SRTM | `SRTMGL1` v003, 30 m | LP DAAC | Slope for the erosion index | NASA open data policy (verify) | planned |
| HLS (Landsat + Sentinel-2) | `HLSL30` / `HLSS30` v2.0 (Earth Engine `NASA/HLS/HLSL30/v002`, `NASA/HLS/HLSS30/v002`) | LP DAAC | Field NDVI at 30 m for the season-progress card. Adapter written 2026-11-15, runs only with Earth Engine enabled, not run yet | NASA open data policy (verify) | planned |
| SMAP L4 surface and root-zone soil moisture, 3-hourly, 9 km | `SPL4SMGP` v008 (Earth Engine `NASA/SMAP/SPL4SMGP/008`), from 2015-03-31 | NSIDC DAAC, NASA GMAO | Root-zone wetness of the field, and the drought layer (root-zone percentile, `GET /api/v1/layers/drought/tiles`). Written 2026-11-15, runs only with Earth Engine enabled, not run yet | NASA open data policy (verify) | planned |
| NASADEM | `NASADEM_HGT` v001, 30 m (Earth Engine `NASA/NASADEM_HGT/001`) | LP DAAC | Field elevation, mean slope and share of low spots. Adapter written 2026-11-15, runs only with Earth Engine enabled, not run yet | NASA open data policy (verify) | planned |
| AppEEARS | service | LP DAAC | Point extraction of SMAP + MODIS | NASA (verify) | planned |

## Space agency partner data

| Dataset | Provider | Use | Licence / attribution | Status |
|---|---|---|---|---|
| Copernicus Sentinel-2 L2A (Earth Engine `COPERNICUS/S2_SR_HARMONIZED`) | ESA / Copernicus | In-field zones at 10 m: median peak-season NDVI of several seasons, each pixel against the field's own median. Adapter written 2026-11-15, runs only with Earth Engine enabled, not run yet | Copernicus licence; attribution "Contains modified Copernicus Sentinel data [year]" (verify) | planned |

## Other data and methods

| Source | Provider | Use | Licence | Status |
|---|---|---|---|---|
| USDA NRCS SSURGO via Soil Data Access (`SDMDataAccess.sc.egov.usda.gov`) | USDA NRCS | Soil horizons (`awc_r`, sand, clay, OM) → available water for the field | Public domain, U.S. Government work (verify) | planned |
| PRISM daily, 4 km (Earth Engine `OREGONSTATE/PRISM/ANd`; `AN81d` is deprecated) | PRISM Climate Group, Oregon State University | Daily temperature and rain for US fields, merged with NASA POWER radiation, humidity and wind. Adapter written 2026-11-15, runs only with Earth Engine enabled, not run yet | verify | planned |
| ERA5-Land daily aggregates, about 11 km (Earth Engine `ECMWF/ERA5_LAND/DAILY_AGGR`) | ECMWF / Copernicus Climate Change Service | Global backup climate after NASA POWER. Adapter written 2026-11-15, not run yet | Copernicus licence (verify) | planned |
| USDA NASS Cropland Data Layer (Earth Engine `USDA/NASS/CDL`) | USDA NASS | Crop of each year from all pixels of the field, in one request (CropScape stays as the no-account source) | Public domain, U.S. Government work (verify) | planned |
| Cloud Score+ for Sentinel-2 (Earth Engine `GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED`) | Google | Cloud mask for the in-field zones | verify | planned |
| Google Earth Engine | Google | Runs the queries above. Needs a Cloud project registered for noncommercial use | Earth Engine terms of service (verify) | planned |
| USDA NASS Crop Sequence Boundaries (CSB) | USDA NASS + ERS | Current rotation of the pilot field (read once by hand) | Public domain, provided "as is" (verify) | planned |
| Penn State and K-State Extension planting guidance (2-inch soil ≥ 50 °F, no freeze in forecast) | Penn State / Kansas State University | Planting-window rule | Citation | planned |
| Iowa State / UW Extension, corn drought yield loss by stage (Claassen & Shaw 1970; Shaw 1988) | ISU / UW | Cited ranges for critical-stage stress (never a prediction) | Citation | planned |
| Al-Kaisi, Elmore, Mallarino and others, [*Corn following corn: yield drag*](https://crops.extension.iastate.edu/encyclopedia/corn-following-corn-management), Integrated Crop Management, Iowa State University Extension (2008) | Iowa State University Extension | Evidence line on the "corn after corn" card: 2000 to 2007 plots, from almost the same to 27% less than corn after soybean, 14% on average. Read 2026-11-15 | Citation | used |
| Mallarino and Pecinovsky, [*Increasing the frequency of corn in crop sequences*](https://crops.extension.iastate.edu/encyclopedia/increasing-frequency-corn-crop-sequences-grain-yield-and-response-nitrogen-research), Iowa State University Extension | Iowa State University Extension | Evidence line on the "corn and soybean" card: Nashua, 1979 to 2004, +16 bu/acre on average, 0 to 40 by year. Read 2026-11-15 | Citation | used |
| [*Considerations for continuous corn*](https://crops.extension.iastate.edu/cropnews/2019/11/considerations-continuous-corn), Integrated Crop Management, Iowa State University Extension (2019) | Iowa State University Extension | "30 to 50 lb/acre more nitrogen" for continuous corn (benefits of the "corn and soybean" card, risks of "corn after corn"). Read 2026-11-15 | Citation | used |
| [*Life cycle*](https://cornrootworm.extension.iastate.edu/basics/life-cycle), Iowa State University corn rootworm site | Iowa State University Extension | Rootworm risk on the rotation cards: extended diapause of northern corn rootworm eggs (two or more winters) and the soybean variant of western corn rootworm. Read 2026-11-15 | Citation | used |
| Robertson and Acharya, [*Does planting green into a rye cover crop affect corn growth and yield?*](https://crops.extension.iastate.edu/post/does-planting-green-rye-cover-crop-affect-corn-growth-and-yield) (2021) | Iowa State University Extension | "Terminate a cereal rye cover 10 to 14 days before planting corn" (evidence line on the rye card). Read 2026-11-15 | Citation | used |
| Robertson and Licht, [*Terminating cover crops ahead of corn*](https://crops.extension.iastate.edu/post/terminating-cover-crops-ahead-corn), Iowa State University Extension with Precision Sustainable Ag | Iowa State University Extension | Corn planted green into rye yielded less at 10 of 13 sites in 2021, 11 of 14 in 2022 and 10 of 12 in 2023 (evidence and risks on the rye card). Read 2026-11-15 | Citation | used |
| SoilGrids 2.0 (sand, clay, SOC) | ISRIC | ~~Soil texture~~ not used after the pivot (SSURGO instead) | CC BY 4.0 | not used |
| Oceanic Niño Index (ONI) | NOAA CPC | ~~ENSO phase~~ not used after the pivot (dry/normal/wet years instead) | U.S. Government work | not used |
| Índice Costero El Niño (ICEN) | ENFEN / IGP (Peru) | not used after the pivot | — | not used |
| FAO-56: Allen, Pereira, Raes, Smith (1998), *Crop evapotranspiration*, FAO Irrigation and Drainage Paper 56 | FAO | ET0 equation, Kc, p, root depth tables | Citation | planned |
| *Arquitectura Clean: principios y ejemplo práctico* (`createam.io/blog/arquitectura-clean.html`, Spanish) | CREATEAM | Reading shared by the team behind the layering rule in `docs/architecture/ARCHITECTURE.md` §3. No text or code copied | Citation | used |
| Saxton & Rawls (2006), *Soil water characteristic estimates by texture and organic matter*, SSSAJ 70:1569 | — | Pedotransfer for field capacity / wilting point | Citation | planned |

## Code libraries

| Library | Licence | Status |
|---|---|---|
| Astro | MIT (verify) | used |
| numpy, pandas | BSD-3-Clause (verify) | used |
| jsonschema | MIT (verify) | used |
| requests | Apache-2.0 (verify) | used |
| earthaccess | MIT (verify) | planned |
| MapLibre GL JS | BSD-3-Clause (verify) | planned |
| Observable Plot | ISC (verify) | planned |

## Fonts, images, music

| Asset | Source | Licence | Status |
|---|---|---|---|
| — | — | — | — |

## Use of Super Intelligence (SI)

| Tool | What it did | Where labelled |
|---|---|---|
| Claude Code (Anthropic) | Repository scaffold, contract draft, planning docs, code assistance | README, file headers |
