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
| OpenET | ensemble, 30 m (Landsat-based) | OpenET consortium (NASA, Google, others) | Field ET (Could; needs an API key) | verify | planned |
| SMAP Enhanced L3 radiometer soil moisture | `SPL3SMP_E` v006, 9 km | NSIDC DAAC | Consistency check of simulated moisture anomalies, 2015–2025 | NASA open data policy (verify) | planned |
| GPM IMERG Final daily | `GPM_3IMERGDF` V07 | GES DISC | Rainfall cross-check, erosivity, 2000–2025 | NASA open data policy (verify) | planned |
| MODIS Vegetation Indices 16-day | `MOD13Q1` v061, 250 m | LP DAAC | NDVI crop calendar and bare windows, 2000– | NASA open data policy (verify) | planned |
| SRTM | `SRTMGL1` v003, 30 m | LP DAAC | Slope for the erosion index | NASA open data policy (verify) | planned |
| HLS (Landsat + Sentinel-2) | `HLSL30` / `HLSS30` v2.0 | LP DAAC | Finer NDVI for small parcels (stretch) | NASA open data policy (verify) | planned |
| AppEEARS | service | LP DAAC | Point extraction of SMAP + MODIS | NASA (verify) | planned |

## Space agency partner data

| Dataset | Provider | Use | Licence / attribution | Status |
|---|---|---|---|---|
| Copernicus Sentinel-2 L2A | ESA / Copernicus | NDVI at 10 m (stretch) | Copernicus licence; attribution "Contains modified Copernicus Sentinel data [year]" (verify) | planned |

## Other data and methods

| Source | Provider | Use | Licence | Status |
|---|---|---|---|---|
| USDA NRCS SSURGO via Soil Data Access (`SDMDataAccess.sc.egov.usda.gov`) | USDA NRCS | Soil horizons (`awc_r`, sand, clay, OM) → available water for the field | Public domain, U.S. Government work (verify) | planned |
| USDA NASS Crop Sequence Boundaries (CSB) | USDA NASS + ERS | Current rotation of the pilot field (read once by hand) | Public domain, provided "as is" (verify) | planned |
| Penn State and K-State Extension planting guidance (2-inch soil ≥ 50 °F, no freeze in forecast) | Penn State / Kansas State University | Planting-window rule | Citation | planned |
| Iowa State / UW Extension, corn drought yield loss by stage (Claassen & Shaw 1970; Shaw 1988) | ISU / UW | Cited ranges for critical-stage stress (never a prediction) | Citation | planned |
| SoilGrids 2.0 (sand, clay, SOC) | ISRIC | ~~Soil texture~~ not used after the pivot (SSURGO instead) | CC BY 4.0 | not used |
| Oceanic Niño Index (ONI) | NOAA CPC | ~~ENSO phase~~ not used after the pivot (dry/normal/wet years instead) | U.S. Government work | not used |
| Índice Costero El Niño (ICEN) | ENFEN / IGP (Peru) | not used after the pivot | — | not used |
| FAO-56: Allen, Pereira, Raes, Smith (1998), *Crop evapotranspiration*, FAO Irrigation and Drainage Paper 56 | FAO | ET0 equation, Kc, p, root depth tables | Citation | planned |
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
