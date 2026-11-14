# Field Shift MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** For one corn field in a US state (recommended: western Kansas), compute a rotation × dry/normal/wet-year matrix from NASA data, plus the corn planting window per year type, and show it on a public Astro site. Each cell holds:
- water-stress days if not irrigated;
- corn critical-stage (VT–R1) stress days;
- irrigation demand in m³/ha;
- bare days;
- erosion index (Should);
- confidence.

**Pivot (2026-11-14, after the mentor session):** tasks 4, 5 and 7 were rewritten. Tasks 6, 8, 9 and 13 were edited for `year_type`, the new metrics and the crop year. Task 15 (GRACE context) is new. Rationale is in `docs/architecture/ARCHITECTURE.md` (D7) and `docs/research/ANTECEDENTES-maiz-EEUU.es.md`.

**Architecture:** An offline Python pipeline (`adapters → domain → usecases`) writes one JSON *ficha* per field that validates against `contracts/ficha.schema.json` **v0.2.0**. The Astro site in `web/` only reads and renders fichas, converting SI to US units for display. It's hosted on Firebase Hosting with no login and no database.

**Tech Stack:** Python 3.12, uv, numpy, pandas, requests, jsonschema, pytest; Astro 7, TypeScript, MapLibre GL JS, Observable Plot, Vitest, Playwright; Firebase Hosting.

**Spec:** `docs/architecture/ARCHITECTURE.md` §1 (R1–R12), plus `docs/submission/SUBMISSION-COMPLIANCE.md`.

## Global Constraints

- Deadline: working public demo by **Sun 2026-11-15 20:00 PET**; hard close 23:59 PET.
- Python `>=3.12`, managed with `uv`; run tests with `cd pipeline && uv run pytest`.
- Node `>=22.23.4` (Astro 7 engines field); pnpm 10.
- No new Python dependency unless a task names it. `scipy`, `rasterio` and `xarray` stay out of the must-have path. Spearman = rank both series, then Pearson.
- Every ficha passes `fieldshift.contract.validate_ficha` before it's written.
- Rotations ≥ 3 per site, exactly one `is_current: true` (brief R1).
- Missing data is `NaN` / `null` / `"not-available"`, **never 0**.
- Units at boundaries: mm/day water, °C, m/s at 2 m, MJ m⁻² day⁻¹, irrigation m³/ha = mm × 10, dates as day-of-year. The pipeline is SI-only; the web formats inches, acre-inches, °F and dates.
- Crop year Y = 1 September Y−1 → 31 August Y, labelled by the summer season it contains (`campaign_start_month = 9`, configurable). A crop belongs to the crop year in which it is planted.
- Stress metrics come from the **rainfed** run; irrigation demand from the **full-irrigation** run, for every rotation regardless of its `irrigated` flag.
- UI text is English. No NASA logos, flags or mission patches. A disclaimer is visible on every page that shows results.
- Every SI-assisted source file starts with a header comment: `SI-assisted (Claude Code); reviewed by <name>`.
- Every external source used is added to `docs/REFERENCES.md` in the same commit.
- Git: one branch per task (`feat/<task-slug>`), PR into `main`, `uv run pytest` / `pnpm test` green before merge. Never push to `main` directly.

## Review Focus

1. **POWER fill values (`-999`) or missing days**: must become `NaN` and be reported, never read as 0 mm rain or −999 °C. Pinned in Task 2.
2. **Seasons crossing the crop-year boundary.**
   - Winter wheat runs Oct → Jul and cereal rye Oct → Apr. Corn, soybean and sorghum are harvested in Sep–Oct, after the 1 September boundary.
   - Schedules and grouping must keep each season in its planting crop year, never split or drop it.
   - The year-type label must use April–September of the same label year.
   - Pinned in Tasks 6 and 7.
3. **The irrigated baseline must not show 0 stress.** Stress comes from the rainfed run for every rotation. Pinned in Task 6.
4. **Few corn years.** Corn–soybean grows corn in about half the years, and the dryland rotation in about a quarter.
   - `critical_stage_stress_days` is NaN in non-corn years, never 0.
   - The band is `null` when a cell has no corn years.
   - `n_corn_years` drives the confidence of that metric.
   - Pinned in Task 8.
5. **NDVI gaps from clouds or snow**: the season detector must not invent a crop season across a long gap. Pinned in Task 11.
6. **A field where SMAP has no valid data**, or a 9 km pixel mixing center pivots and dryland: the validation block says `not-available` (no data) or names the mixing in its note. It never reports a correlation of zeros. Pinned in Task 10.

## Lanes and cut lines

| Lane | Owner (proposed) | Tasks | Cut line |
|---|---|---|---|
| A — twin + integration | Richard | 1, 2, 3, 6, 8, 9, 14 | **Must** |
| B — crops, year types, planting window, GRACE | Hildemaro | 5, 7 (**Must**), 15 (Should) | 15 drops to "not shown" |
| C — soil, SMAP, erosion | Miguel | 4 (**Must**), 10, 12 (Should) | 10/12 drop to `not-available` |
| D — NDVI calendar | Denise | 11 | Should (calendar falls back to `assumed`) |
| E — web | Marcelo | 13 | **Must** |

Task 9 accepts missing Should-lane outputs, so the Must path ships alone if needed.

**Could (out unless everything else is green):**
- OpenET field ET; it needs an API key.
- Planting-date scenarios: early / normal / late planting shifting the VT–R1 window. This is the best answer to "when to plant" beyond the 2024 winner, but it is not Must.
- A GDD-based silking date.
- A second state.

---

### Task 1: Contract semantic validator

**Files:**
- Create: `pipeline/src/fieldshift/contract.py`
- Test: `pipeline/tests/test_contract.py`

**Interfaces:**
- Consumes: `contracts/ficha.schema.json`, `contracts/examples/example-ficha.json` (exist).
- Produces: `class FichaError(ValueError)` with attribute `problems: list[str]`; `validate_ficha(doc: dict) -> None` (raises `FichaError`).

- [ ] **Step 1: Write the failing tests**

```python
import copy, json
from pathlib import Path
import pytest
from fieldshift.contract import FichaError, validate_ficha

EX = json.loads((Path(__file__).resolve().parents[2] / "contracts/examples/example-ficha.json").read_text(encoding="utf-8"))

def test_example_passes():
    validate_ficha(EX)

def test_two_current_rotations_rejected():
    doc = copy.deepcopy(EX); doc["rotations"][1]["is_current"] = True
    with pytest.raises(FichaError, match="exactly one current rotation"):
        validate_ficha(doc)

def test_matrix_cell_for_unknown_rotation_rejected():
    doc = copy.deepcopy(EX); doc["matrix"][0]["rotation_id"] = "nope"
    with pytest.raises(FichaError, match="unknown rotation_id 'nope'"):
        validate_ficha(doc)

def test_missing_rotation_year_type_cell_rejected():
    doc = copy.deepcopy(EX); doc["matrix"] = doc["matrix"][1:]
    with pytest.raises(FichaError, match="missing cell"):
        validate_ficha(doc)

def test_corn_years_cannot_exceed_years():
    doc = copy.deepcopy(EX); doc["matrix"][0]["n_corn_years"] = doc["matrix"][0]["n_years"] + 1
    with pytest.raises(FichaError, match="n_corn_years"):
        validate_ficha(doc)

def test_null_critical_band_requires_zero_corn_years():
    doc = copy.deepcopy(EX); doc["matrix"][0]["metrics"]["critical_stage_stress_days"] = None
    with pytest.raises(FichaError, match="critical_stage_stress_days"):
        validate_ficha(doc)

def test_band_out_of_order_rejected():
    doc = copy.deepcopy(EX); doc["matrix"][0]["metrics"]["bare_days"] = {"p10": 9, "p50": 5, "p90": 7}
    with pytest.raises(FichaError, match="p10 <= p50 <= p90"):
        validate_ficha(doc)

def test_schema_errors_are_collected():
    doc = copy.deepcopy(EX); del doc["disclaimer"]
    with pytest.raises(FichaError) as e:
        validate_ficha(doc)
    assert any("disclaimer" in p for p in e.value.problems)
```

- [ ] **Step 2: Run to verify it fails** — `cd pipeline && uv run pytest tests/test_contract.py -v` → FAIL, `ModuleNotFoundError: fieldshift.contract`.
- [ ] **Step 3: Implement `validate_ficha(doc: dict) -> None`** in `contract.py`. First collect all `Draft202012Validator` errors, then run the semantic checks:
  - exactly one `is_current`;
  - every `matrix[].rotation_id` exists;
  - every rotation × year type that occurs anywhere in the matrix has a cell;
  - every non-null band has `p10 <= p50 <= p90`, including the `planting.all_years` and `planting.by_year_type` bands;
  - `n_corn_years <= n_years`;
  - `critical_stage_stress_days` is `null` exactly when `n_corn_years == 0`.

  Raise one `FichaError` listing every problem.
- [ ] **Step 4: Run to verify it passes** — same command → 8 passed; `uv run pytest` → all green.
- [ ] **Step 5: Commit** — `git add pipeline/src/fieldshift/contract.py pipeline/tests/test_contract.py && git commit -m "feat: add ficha semantic validator"`

---

### Task 2: Cached HTTP + NASA POWER adapter

**Files:**
- Create: `pipeline/src/fieldshift/adapters/http.py`, `pipeline/src/fieldshift/adapters/power.py`
- Create: `pipeline/tests/fixtures/power_sample.json` (recorded, ≤ 40 days)
- Test: `pipeline/tests/test_power.py`

**Interfaces:**
- Produces: `get_json(url: str, cache_path: Path, retries: int = 4, timeout_s: float = 60) -> dict`, which returns the cached file if present, otherwise GETs with exponential backoff on `ConnectionError`/5xx, then writes the cache.
- Produces: `parse_power_json(payload: dict) -> pd.DataFrame` and `fetch_power_daily(lat: float, lon: float, start: date, end: date, cache_dir: Path) -> pd.DataFrame`. DatetimeIndex named `date`; float columns `tmax_c, tmin_c, rh_pct, u2_ms, rs_mj, precip_mm, tsoil1_c, gwettop`; `attrs["units"]` maps column → unit string read from the payload.
- POWER request: `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR,TSOIL1,GWETTOP&community=AG&longitude={lon}&latitude={lat}&start={YYYYMMDD}&end={YYYYMMDD}&format=JSON`. Split requests by calendar year (cache file per year). Probe 2026-11-14 at 39.36, −100.44: HTTP 200; `TSOIL1` in °C and `GWETTOP` unitless (0–1) returned daily.

- [ ] **Step 1: Record the fixture** — call the URL above once for the pilot field, 1 Apr – 10 May 2025, through Python or PowerShell (Git-Bash curl fails TLS here). Save it as `power_sample.json`, then edit one day's `PRECTOTCORR` and one day's `T2M_MAX` to `-999.0`.
- [ ] **Step 2: Write the failing tests**

```python
def test_parse_columns_and_index(sample):
    df = parse_power_json(sample)
    assert list(df.columns) == ["tmax_c", "tmin_c", "rh_pct", "u2_ms", "rs_mj", "precip_mm", "tsoil1_c", "gwettop"]
    assert df.index.name == "date" and df.index.is_monotonic_increasing

def test_fill_value_becomes_nan_not_zero(sample):
    df = parse_power_json(sample)
    assert df["precip_mm"].isna().sum() == 1 and df["tmax_c"].isna().sum() == 1
    assert (df["tmax_c"].dropna() > -100).all()

def test_units_are_read_from_payload(sample):
    assert parse_power_json(sample).attrs["units"]["rs_mj"].lower().startswith("mj")

def test_get_json_uses_cache_without_network(tmp_path, monkeypatch):
    p = tmp_path / "c.json"; p.write_text('{"ok": 1}')
    monkeypatch.setattr("requests.get", lambda *a, **k: (_ for _ in ()).throw(AssertionError("network")))
    assert get_json("https://x", p) == {"ok": 1}
```

- [ ] **Step 3: Run to verify it fails** — `uv run pytest tests/test_power.py -v` → FAIL (import error).
- [ ] **Step 4: Implement** `get_json`, `parse_power_json` (map `-999`/the payload's `fill_value` to `NaN`) and `fetch_power_daily` (per-year cache `cache_dir/power/{lat}_{lon}_{year}.json`, concatenated and sliced to `[start, end]`).
- [ ] **Step 5: Run to verify it passes**; then a one-off live check: `uv run python -c "from datetime import date; from pathlib import Path; from fieldshift.adapters.power import fetch_power_daily as f; print(f(<lat>,<lon>,date(1981,1,1),date(2025,12,31),Path('../data/raw')).isna().sum())"`. Expect ≈16 400 rows and NaN counts printed.
- [ ] **Step 6: Commit.** Mark the POWER row in `docs/REFERENCES.md` as `used`, including `TSOIL1` and `GWETTOP`.

---

### Task 3: FAO-56 reference evapotranspiration

**Files:**
- Create: `pipeline/src/fieldshift/domain/et0.py`
- Test: `pipeline/tests/test_et0.py`

**Interfaces:**
- Produces: `ea_from_rh_mean(tmax_c, tmin_c, rh_mean_pct) -> float` (FAO-56 eq. 19) and `et0_fao56(tmax_c, tmin_c, ea_kpa, u2_ms, rs_mj, lat_deg, elev_m, doy) -> float` (eq. 6, daily, G = 0, Rso = (0.75 + 2e-5·z)·Ra). Both accept floats or numpy arrays (broadcasting).

- [ ] **Step 1: Write the failing tests** (FAO-56 Example 18, Uccle, 6 July)

```python
def test_fao56_example_18():
    et0 = et0_fao56(tmax_c=21.5, tmin_c=12.3, ea_kpa=1.409, u2_ms=2.078, rs_mj=22.07, lat_deg=50.80, elev_m=100, doy=187)
    assert abs(et0 - 3.9) < 0.1

def test_vectorised_matches_scalar():
    a = et0_fao56(np.array([21.5, 21.5]), 12.3, 1.409, 2.078, 22.07, 50.80, 100, 187)
    assert a.shape == (2,) and abs(a[0] - 3.9) < 0.1

def test_ea_from_rh_mean():
    assert abs(ea_from_rh_mean(25.0, 15.0, 60.0) - 0.6 * (0.6108*np.exp(17.27*25/(25+237.3)) + 0.6108*np.exp(17.27*15/(15+237.3))) / 2) < 1e-9
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** with FAO-56 eqs. 7, 8, 11–13, 21–25, 37–40. Comment each eq. number. **Step 4: Run** → PASS. **Step 5: Commit** (add the FAO-56 row to REFERENCES).

---

### Task 4: Soil profile → available water (USDA SSURGO via Soil Data Access)

**Files:**
- Create: `pipeline/src/fieldshift/adapters/ssurgo.py`, `pipeline/src/fieldshift/domain/soil.py`, `pipeline/tests/fixtures/sda_sample.json`
- Modify: `pipeline/src/fieldshift/adapters/http.py` (add `post_json`)
- Test: `pipeline/tests/test_soil.py`

**Interfaces:**
- Produces: `post_json(url: str, body: dict, cache_path: Path, retries: int = 4, timeout_s: float = 60) -> dict`. Same caching and backoff as `get_json`, but POST with a JSON body.
- Produces: `fetch_sda_horizons(lat: float, lon: float, cache_dir: Path) -> dict`. It POSTs to `https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest` with `{"query": SQL, "format": "JSON+COLUMNNAME"}`. SQL (probe 2026-11-14 at 39.36, −100.44 → HTTP 200, Keith silt loam 1–3 %, `awc_r` 0.21):
  ```sql
  SELECT mu.mukey, mu.muname, c.compname, c.comppct_r, ch.hzdept_r, ch.hzdepb_r,
         ch.sandtotal_r, ch.claytotal_r, ch.om_r, ch.awc_r
  FROM mapunit mu
  INNER JOIN component c ON c.mukey = mu.mukey
  INNER JOIN chorizon ch ON ch.cokey = c.cokey
  WHERE mu.mukey IN (SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('point({lon} {lat})'))
    AND c.majcompflag = 'Yes'
  ORDER BY c.comppct_r DESC, ch.hzdept_r
  ```
- Produces: `parse_sda(payload: dict) -> pd.DataFrame`. The first row of `Table` is the header. Numeric columns are floats; empty or null cells become `NaN`.
- Produces: `@dataclass(frozen=True) SoilProfile(map_unit: str, sand_pct: float, clay_pct: float, organic_matter_pct: float, taw_mm_per_m: float, source: str)` and `profile_from_horizons(h: pd.DataFrame, depth_cm: float = 150) -> SoilProfile`.
  - Per component, take the depth-weighted mean over 0–`depth_cm` of `awc_r`, sand, clay and `om_r`. Truncate horizons at `depth_cm`, and skip rows whose value is NaN.
  - Then take the mean across components, weighted by `comppct_r`.
  - TAW = mean `awc_r` (cm/cm) × 1000 mm/m. `source = "USDA NRCS SSURGO (Soil Data Access), mukey <id>"`.
  - Raise `ValueError` if no horizon has `awc_r`.
- Keep as cross-check and fallback only: `taw_mm_per_m(sand_pct, clay_pct, om_pct) -> float`, Saxton & Rawls (2006) eqs. 1–2. Used when SDA is down, with a team-typed texture labelled `assumed`.

- [ ] **Step 1: Record the fixture** for the pilot field with the probe query, and save it as `sda_sample.json`.
- [ ] **Step 2: Write the failing tests**

```python
def hz(rows):  # rows: (comppct, top, bottom, awc, sand, clay, om)
    return pd.DataFrame(rows, columns=["comppct_r", "hzdept_r", "hzdepb_r", "awc_r", "sandtotal_r", "claytotal_r", "om_r"]).assign(muname="m", mukey="1", compname="c")

def test_depth_weighted_and_truncated():
    p = profile_from_horizons(hz([(100, 0, 50, 0.20, 20, 20, 2), (100, 50, 200, 0.10, 20, 20, 1)]), depth_cm=100)
    assert p.taw_mm_per_m == pytest.approx(150.0)

def test_component_weighted():
    p = profile_from_horizons(hz([(60, 0, 150, 0.20, 20, 20, 2), (40, 0, 150, 0.10, 60, 10, 1)]))
    assert p.taw_mm_per_m == pytest.approx(160.0)

def test_missing_awc_rejected():
    with pytest.raises(ValueError): profile_from_horizons(hz([(100, 0, 150, np.nan, 20, 20, 2)]))

def test_fixture_profile(sample):
    p = profile_from_horizons(parse_sda(sample))
    assert 150 < p.taw_mm_per_m < 250 and p.map_unit.startswith("Keith") and p.source.startswith("USDA NRCS SSURGO")

def test_saxton_rawls_crosscheck():  assert abs(taw_mm_per_m(40, 20, 2.5) - 142.6) < 2.0
def test_rejects_impossible_texture():
    with pytest.raises(ValueError): taw_mm_per_m(80, 40, 2)
```

- [ ] **Step 3: Run** → FAIL. **Step 4: Implement.** **Step 5: Run** → PASS. **Step 6: Commit.** Add the SSURGO/SDA and Saxton & Rawls rows to REFERENCES.

---

### Task 5: Crop parameters and site configuration

**Files:**
- Create: `pipeline/src/fieldshift/domain/crops.py`, `pipeline/src/fieldshift/usecases/site_config.py`, `pipeline/config/sites/<site-id>.json` (team fills after kickoff decision 1)
- Test: `pipeline/tests/test_crops_config.py`

**Interfaces:**
- Produces: `@dataclass(frozen=True) CropParams(name: str, kc_ini: float, kc_mid: float, kc_end: float, stage_days: tuple[int, int, int, int], zr_max_m: float, p: float, critical_window: tuple[int, int] | None = None)`.
  - `CROPS: dict[str, CropParams]` has keys `corn, soybean, winter_wheat, sorghum`. `KC_BARE = 0.30`, `ZR_BARE_M = 0.30`.
  - The cover crop `cereal_rye` maps to the `winter_wheat` parameters, because FAO-56 has no rye row. Record that as an information gap in every rotation that uses it.
  - `critical_window = (start_offset_days, length_days)` is measured from the start of the mid-season stage. For `corn` it is `(-7, 21)`: about tasseling to silking (VT–R1), to be confirmed against the FAO-56 text on effective full cover. It is `None` for other crops.
  - `stage_days` are FAO-56 Table 11 lengths. A step's harvest date overrides the season length by scaling the four stages proportionally.
- Produces: `@dataclass Step(crop: str, plant: tuple[int, int], harvest: tuple[int, int], role: str)` (month, day).
- Produces: `@dataclass Rotation(id, name, is_current, irrigated: bool, campaigns: list[list[Step]], why_suggested, evidence: list[dict], benefits, information_gaps, risks_for_local_review, priority_fit: dict)`.
- Produces: `@dataclass SiteConfig(id, name, state, county, lat, lon, elevation_m, priorities: list[str], campaign_start_month: int = 9, start_year: int, end_year: int, soil_depth_cm: float = 150, slope_pct: float | None, k_factor: float | None, rotations: list[Rotation])`.
- Produces: `load_site_config(path: Path) -> SiteConfig`. A rotation's `campaigns` cycle: crop year Y uses `campaigns[(Y - start_year) % len(campaigns)]`. The loader rejects a step planted before the previous step's harvest, whether in the same crop year or across a boundary.

- [ ] **Step 1: Confirm the numbers in the paper first.** Open FAO-56 Table 12 (Kc), Table 22 (Zr: the upper value of the range; p) and Table 11 (stage lengths). The test values below are the *expected* table values. If the paper differs, the paper wins: fix the test and note the page.
- [ ] **Step 2: Write the failing tests**

```python
@pytest.mark.parametrize("crop,kc,zr,p", [
    ("corn",         (0.30, 1.20, 0.35), 1.7, 0.55),   # "Maize, field (grain)"; Kc end 0.35 = harvested dry
    ("soybean",      (0.40, 1.15, 0.50), 1.3, 0.50),
    ("winter_wheat", (0.40, 1.15, 0.25), 1.8, 0.55),
    ("sorghum",      (0.30, 1.05, 0.55), 2.0, 0.55),   # "Sorghum, grain"; Kc mid 1.00–1.10
])
def test_fao56_values(crop, kc, zr, p):
    c = CROPS[crop]; assert (c.kc_ini, c.kc_mid, c.kc_end) == kc and c.zr_max_m == zr and c.p == p

def test_only_corn_has_a_critical_window():
    assert CROPS["corn"].critical_window == (-7, 21) and CROPS["soybean"].critical_window is None

def test_config_needs_three_rotations_one_current(tmp_path):  # write a config with 2 rotations
    with pytest.raises(ValueError, match="at least 3 rotations"): load_site_config(two_rotation_cfg(tmp_path))

def test_unknown_crop_rejected(tmp_path):
    with pytest.raises(ValueError, match="unknown crop 'quinoa'"): load_site_config(cfg_with_crop(tmp_path, "quinoa"))

def test_overlapping_steps_rejected(tmp_path):   # soybean planted 1 Oct before corn harvested 10 Oct
    with pytest.raises(ValueError, match="overlaps"): load_site_config(cfg_overlap(tmp_path))
```

- [ ] **Step 3: Run** → FAIL. **Step 4: Implement.** Write `pipeline/config/sites/<field-id>.json` with the rotations decided by the team (decision 2). The current rotation comes from Crop Sequence Boundaries, read once by hand. Crops outside FAO-56 are added only with a cited source in the same commit. **Step 5: Run** → PASS. **Step 6: Commit.**

---

### Task 6: Daily soil-water balance and campaign metrics

**Files:**
- Create: `pipeline/src/fieldshift/domain/water_balance.py`
- Test: `pipeline/tests/test_water_balance.py`

**Interfaces:**
- Consumes: `CropParams`, `CROPS`, `KC_BARE`, `ZR_BARE_M`, `Rotation` (Task 5).
- Produces: `build_schedule(index: pd.DatetimeIndex, rotation: Rotation, start_year: int, campaign_start_month: int = 9) -> pd.DataFrame`.
  - Columns: `crop: str` (`"bare"` outside crops), `in_crop: bool`, `kc`, `zr_m`, `p`, `critical: bool` (inside the corn critical window) and `crop_year: int`.
  - The Kc curve is piecewise linear by stage (FAO-56 Fig. 25).
  - Crop year Y runs 1 Sep Y−1 → 31 Aug Y. A step whose plant month is ≥ `campaign_start_month` is planted in calendar year Y−1, otherwise in Y. Its harvest is the first occurrence of the harvest month/day after planting.
  - Crop days carry the crop year of their planting, so a corn harvest on 10 Oct Y stays in Y. Bare days carry the crop year of their date.
- Produces: `simulate(et0_mm: pd.Series, precip_mm: pd.Series, schedule: pd.DataFrame, taw_mm_per_m: float, irrigated: bool) -> pd.DataFrame`, with columns `dr_mm, taw_mm, raw_mm, ks, etc_adj_mm, stress, irrigation_mm, deep_perc_mm, rel_moisture`. FAO-56 ch. 8: Dr starts at 0; Dr_i = clip(Dr_{i-1} − P + Ks·Kc·ET0, 0, TAW); excess → deep percolation. If irrigated and in crop and Dr > RAW, refill to 0. `stress = in_crop & (ks < 1)`. `rel_moisture = 1 − Dr/TAW`. A day with NaN ET0 or rain skips the update (Dr carried forward) and sets an extra boolean column `nan_input`; it is never zero-filled.
- Produces: `campaign_metrics(rainfed: pd.DataFrame, irrigated: pd.DataFrame, schedule: pd.DataFrame) -> pd.DataFrame`, indexed by `schedule.crop_year`. Columns:
  - `water_stress_days`: rainfed `stress` count.
  - `critical_stage_stress_days`: rainfed `stress & critical` count. NaN in crop years without corn, never 0.
  - `has_corn: bool`.
  - `irrigation_m3_ha`: irrigated `irrigation_mm` sum × 10.
  - `bare_days` and `nan_days`.

  Task 12 adds `erosion_index`.

- [ ] **Step 1: Write the failing tests**

```python
def test_dry_spell_stress_starts_after_raw():   # ET0=5, P=0, Kc=1, TAW=100 (Zr=1), p=0.5
    out = simulate(et0(5, 30), rain(0, 30), sched(kc=1.0, zr=1.0, p=0.5), 100, irrigated=False)
    assert not out["stress"].iloc[:10].any() and out["stress"].iloc[11]
    assert (out["dr_mm"] <= out["taw_mm"] + 1e-9).all()

def test_big_rain_refills_and_percolates():
    out = simulate(et0(5, 3), rain_series([200, 0, 0]), sched(1.0, 1.0, 0.5), 100, False)
    assert out["dr_mm"].iloc[0] == 0 and out["deep_perc_mm"].iloc[0] == pytest.approx(195)

def test_irrigated_never_stressed_and_counts_water():
    out = simulate(et0(5, 60), rain(0, 60), sched(1.0, 1.0, 0.5), 100, True)
    assert not out["stress"].any() and out["irrigation_mm"].sum() > 0

def test_bare_days_never_count_as_stress():
    out = simulate(et0(5, 30), rain(0, 30), sched_bare(30), 100, irrigated=False)
    assert not out["stress"].any()

def test_winter_wheat_planted_in_october_belongs_to_next_label_year():   # plant 15 Oct 2010, harvest 1 Jul 2011
    s = build_schedule(pd.date_range("2010-09-01", "2011-08-31"), one_step_rotation((10, 15), (7, 1), crop="winter_wheat"), 2011)
    assert s.loc["2011-01-15", "in_crop"] and s.loc["2010-11-01", "crop_year"] == 2011 and not s.loc["2011-07-15", "in_crop"]

def test_corn_harvest_after_boundary_stays_in_planting_year():   # plant 25 Apr 2011, harvest 10 Oct 2011
    s = build_schedule(pd.date_range("2010-09-01", "2012-08-31"), one_step_rotation((4, 25), (10, 10), crop="corn"), 2011)
    assert s.loc["2011-09-20", "in_crop"] and s.loc["2011-09-20", "crop_year"] == 2011
    assert s.loc["2011-06-15":"2011-08-15", "critical"].any() and not s.loc["2011-05-01", "critical"]

def test_irrigated_rotation_still_reports_rainfed_stress():
    sch = corn_schedule(2011); rf = simulate(et0(6, len(sch)), rain(0, len(sch)), sch, 150, False)
    ir = simulate(et0(6, len(sch)), rain(0, len(sch)), sch, 150, True)
    m = campaign_metrics(rf, ir, sch).loc[2011]
    assert m.water_stress_days > 0 and m.critical_stage_stress_days > 0 and m.irrigation_m3_ha > 0

def test_critical_stress_is_nan_in_a_soybean_year():
    sch = soybean_schedule(2012); rf = simulate(et0(6, len(sch)), rain(0, len(sch)), sch, 150, False)
    m = campaign_metrics(rf, rf, sch).loc[2012]
    assert np.isnan(m.critical_stage_stress_days) and not m.has_corn

def test_nan_rain_is_flagged_not_zeroed():
    r = rain(0, 10); r.iloc[4] = np.nan
    out = simulate(et0(5, 10), r, sched(1.0, 1.0, 0.5), 100, False)
    assert out["nan_input"].sum() == 1 and out["dr_mm"].notna().all()
    assert out["dr_mm"].iloc[4] == out["dr_mm"].iloc[3]
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (a plain Python loop over days is fine: 16 k days × 3 rotations × 2 runs). **Step 4: Run** → PASS. **Step 5: Commit.**

---

### Task 7: Year types (dry / normal / wet) and corn planting window

No network adapter: both use the POWER frame from Task 2.

**Files:**
- Create: `pipeline/src/fieldshift/domain/climate_years.py`, `pipeline/src/fieldshift/domain/planting.py`
- Test: `pipeline/tests/test_climate_years.py`, `pipeline/tests/test_planting.py`

**Interfaces:**
- Produces: `growing_season_totals(precip_mm: pd.Series, years: Iterable[int], months: tuple[int, ...] = (4, 5, 6, 7, 8, 9), max_missing_frac: float = 0.05) -> pd.Series`. Indexed by label year, it sums April–September **of that calendar year**. If more than `max_missing_frac` of the season's days are NaN, the year's total is NaN.
- Produces: `classify_year_types(totals: pd.Series) -> dict[int, str]`.
  - Values are `"dry" | "normal" | "wet"`. NaN years are omitted, not guessed.
  - With `n` valid years and `k = n // 3`: the `k` lowest totals are `dry`, the `k` highest are `wet`, and the rest are `normal`.
  - Rank with `method="first"`, so ties are deterministic.
- Produces: `planting_ready_doy(daily: pd.DataFrame, year: int, soil_c: float = 10.0, mean_days: int = 5, frost_c: float = 0.0, lookahead_days: int = 7, earliest: tuple[int, int] = (4, 1), latest: tuple[int, int] = (6, 30)) -> float`.
  - Returns the first day-of-year d in [earliest, latest] where the `mean_days` mean of `tsoil1_c` ending on d is ≥ `soil_c`, and `tmin_c` stays > `frost_c` on d and the following `lookahead_days − 1` days.
  - Returns NaN if no such day exists or the inputs are NaN.
  - Source of the rule: Penn State and K-State extension (2-inch soil ≥ 50 °F, no freeze in the forecast). Information gap: `TSOIL1` is the MERRA-2 top layer at ~0.5°, not a 2-inch probe.
- Produces: `last_spring_frost_doy(tmin_c: pd.Series, year: int, frost_c: float = 0.0, before: tuple[int, int] = (7, 1)) -> float`. Returns the last day before 1 July with `tmin_c <= frost_c`, or NaN without data.
- Produces: `planting_block(daily: pd.DataFrame, year_types: dict[int, str]) -> dict`. It returns the schema's `all_years` and `by_year_type` parts.
  - **`all_years` is the actionable answer.** The farmer cannot know in April whether the summer will be dry, so this is what the UI leads with.
  - **`by_year_type`** is context, e.g. "wet springs plant later".
  - Bands are p10/p50/p90 over the valid years, rounded to whole days, or `null` when there are none.

- [ ] **Step 1: Write the failing tests**

```python
def test_45_years_split_15_15_15():
    t = pd.Series(np.arange(45.0), index=range(1981, 2026))
    yt = classify_year_types(t); assert Counter(yt.values()) == {"dry": 15, "normal": 15, "wet": 15}
    assert yt[1981] == "dry" and yt[2025] == "wet"

def test_year_with_missing_season_is_omitted():
    p = daily_rain(2000, 2002, mm=2.0); p["2001-06-01":"2001-06-30"] = np.nan
    assert np.isnan(growing_season_totals(p, [2000, 2001, 2002])[2001])
    assert 2001 not in classify_year_types(growing_season_totals(p, [2000, 2001, 2002]))

def test_label_year_uses_april_to_september_only():   # all rain falls in October 2010
    p = daily_rain(2010, 2011, mm=0.0); p["2010-10-01":"2010-10-31"] = 10.0
    tot = growing_season_totals(p, [2010, 2011]); assert tot[2010] == 0 and tot[2011] == 0

def test_ready_waits_for_warm_soil_then_frost_free_week():
    d = spring(2015, soil_warm_from="2015-04-18", frost_on=["2015-04-22"])
    assert planting_ready_doy(d, 2015) == pd.Timestamp("2015-04-23").dayofyear   # 23–29 Apr frost-free; soil mean 19–23 Apr warm

def test_ready_is_nan_when_soil_never_warms():
    assert np.isnan(planting_ready_doy(spring(2015, soil_warm_from=None), 2015))

def test_last_spring_frost():
    assert last_spring_frost_doy(tmin_series(2015, frost_on=["2015-04-10", "2015-05-02"]), 2015) == pd.Timestamp("2015-05-02").dayofyear
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit.** Add rows to REFERENCES: POWER `TSOIL1` and Penn State / K-State planting guidance.

---

### Task 8: Rotation × year-type matrix with confidence

**Files:**
- Create: `pipeline/src/fieldshift/usecases/matrix.py`
- Test: `pipeline/tests/test_matrix.py`

**Interfaces:**
- Consumes:
  - `campaign_metrics(...)` frames from Task 6 (with `has_corn` and `critical_stage_stress_days`), plus an optional `erosion_index` column from Task 12;
  - the `classify_year_types(...)` dict from Task 7;
  - `validation_status: str`, from Task 10 or `"not-available"`.
- Produces: `build_matrix(metrics_by_rotation: dict[str, pd.DataFrame], year_types: dict[int, str], validation_status: str) -> list[dict]`. Each dict is a schema `cell`.
  - **Metric keys** are the frame's column names: `water_stress_days`, `critical_stage_stress_days`, `irrigation_m3_ha`, `bare_days`, and `erosion_index` only when that column exists.
  - **Bands** are `numpy.percentile` 10/50/90 (linear) over non-NaN years, rounded to 1 decimal. `critical_stage_stress_days` uses corn years only; it is `null` when there are none.
  - **Counts:** `n_corn_years` counts `has_corn` years in the cell.
  - **Confidence:** the same thresholds apply to `n_years` and `n_corn_years`. A corn–soybean cell (about 7 corn years) therefore tops out at `medium`, and the dryland rotation (about 4) is `low`.
    - `low` if `n_years < 5`, or `n_corn_years < 5`, or `validation_status == "inconsistent"`;
    - else `medium` if `n_years < 10`, or `n_corn_years < 10`, or `validation_status in {"weak", "not-available"}`;
    - else `high`.
  - `confidence_reason` names every trigger, e.g. `"only 3 corn years of this type; SMAP check not available"`.

- [ ] **Step 1: Write the failing tests**

```python
def test_groups_years_by_year_type():
    cells = build_matrix(three_rotation_frames(), nine_year_types(), "consistent")
    assert len(cells) == 9 and all(c["years"] == sorted(c["years"]) for c in cells)

def test_quantiles():   # water_stress_days 10..50 over five dry years
    cell = only_cell(build_matrix({"r": frame(years=range(2001, 2006), water_stress_days=[10, 20, 30, 40, 50])}, all_type("dry", 2001, 2005), "consistent"))
    assert cell["metrics"]["water_stress_days"] == {"p10": 14.0, "p50": 30.0, "p90": 46.0}

def test_few_years_low_confidence():
    cell = only_cell(build_matrix({"r": frame(years=[1983, 1998, 2016])}, {1983: "wet", 1998: "wet", 2016: "wet"}, "consistent"))
    assert cell["confidence"] == "low" and "3 years" in cell["confidence_reason"]

def test_missing_validation_caps_at_medium():
    cell = only_cell(build_matrix({"r": frame(years=range(2000, 2012))}, all_type("normal", 2000, 2011), "not-available"))
    assert cell["confidence"] == "medium" and "SMAP" in cell["confidence_reason"]

def test_critical_band_null_without_corn_years():
    cell = only_cell(build_matrix({"r": frame(years=range(2000, 2012), has_corn=False)}, all_type("dry", 2000, 2011), "consistent"))
    assert cell["metrics"]["critical_stage_stress_days"] is None and cell["n_corn_years"] == 0 and cell["confidence"] == "low"

def test_corn_soy_counts_corn_years():   # 12 dry years, corn every other year
    cell = only_cell(build_matrix({"r": frame(years=range(2000, 2012), has_corn=[y % 2 == 0 for y in range(2000, 2012)])}, all_type("dry", 2000, 2011), "consistent"))
    assert cell["n_years"] == 12 and cell["n_corn_years"] == 6 and cell["confidence"] == "medium"

def test_year_without_type_is_ignored():
    cells = build_matrix({"r": frame(years=[2000, 2025])}, {2000: "normal"}, "consistent")
    assert all(2025 not in c["years"] for c in cells)
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit.**

---

### Task 9: `build_site_ficha` use case and CLI

**Files:**
- Create: `pipeline/src/fieldshift/usecases/build_ficha.py`
- Modify: `pipeline/src/fieldshift/cli.py` (replace the stub)
- Test: `pipeline/tests/test_build_ficha.py` (offline: Task 2 and 4 fixtures, plus a 3-crop-year POWER fixture)

**Interfaces:**
- Consumes: everything above. Optional inputs: `Agreement` (Task 10), `Season`/`Window` lists (Task 11), `erosion_index` (Task 12) and the `water_context` block (Task 15).
- Produces: `build_site_ficha(cfg: SiteConfig, cache_dir: Path, appeears_dir: Path | None = None) -> dict` (already `validate_ficha`-clean); `main(["build", "--site", PATH, "--out", DIR]) -> int` writes `DIR/<site.id>.json` and returns 0; returns 2 with a message on `FichaError`.
- Ficha `rotations[].sequence` = the rotation's `campaigns` flattened in order (plant/harvest months only). `rotations[].irrigated` comes from the config.
- `site` carries `state`, `county`, and `soil.map_unit` from the Task 4 `SoilProfile`.
- `planting`:
  - `status = "computed"` with `planting_block(...)` when POWER `TSOIL1` is present;
  - otherwise `"not-available"`, with every band `null`;
  - `rule` and `source` written out in words, including the MERRA-2 caveat.
- Behaviour when optional inputs are absent:
  - `validation.status = "not-available"`;
  - `calendar.status = "assumed"`, with seasons from the config's current rotation;
  - `erosion_index` omitted from every cell. The schema allows it; the UI shows "not computed".
- When Task 12 is merged but the config lacks `slope_pct` / `k_factor`: use the SSURGO map-unit slope class midpoint if available, else `slope_pct = 2` (Keith 1–3 %). Use `k_factor = 0.03`, and add an information gap naming the default.

- [ ] **Step 1: Write the failing tests**

```python
def test_offline_build_is_valid(fixture_site_cfg, fixture_cache):
    doc = build_site_ficha(fixture_site_cfg, fixture_cache)
    validate_ficha(doc)
    assert doc["provenance"]["kind"] == "computed" and len(doc["rotations"]) >= 3

def test_without_appeears_marks_not_available(fixture_site_cfg, fixture_cache):
    doc = build_site_ficha(fixture_site_cfg, fixture_cache, appeears_dir=None)
    assert doc["validation"]["status"] == "not-available" and doc["calendar"]["status"] == "assumed"

def test_planting_block_and_year_types(fixture_site_cfg, fixture_cache):
    doc = build_site_ficha(fixture_site_cfg, fixture_cache)
    assert doc["planting"]["status"] in {"computed", "not-available"}
    assert {c["year_type"] for c in doc["matrix"]} <= {"dry", "normal", "wet"}

def test_cli_writes_file(tmp_path, fixture_site_path, fixture_cache, monkeypatch):
    assert main(["build", "--site", str(fixture_site_path), "--out", str(tmp_path)]) == 0
    assert (tmp_path / "fixture-site.json").exists()
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** Provenance lists every dataset actually used, with product ID and period. **Step 4: Run** → PASS, then run live for the pilot site: `uv run fieldshift build --site config/sites/<id>.json --out ../web/public/data/fichas`. **Step 5: Commit** (code + the generated pilot ficha).

---

### Task 10: AppEEARS loader + SMAP consistency check (Should)

**Files:**
- Create: `pipeline/src/fieldshift/adapters/appeears.py`, `pipeline/src/fieldshift/domain/validation.py`, `pipeline/tests/fixtures/appeears_smap_sample.csv`
- Test: `pipeline/tests/test_validation.py`

**Interfaces:**
- Produces: `load_point_csv(path: Path, layer: str, qa_layer: str | None = None, good_qa: set[int] | None = None) -> pd.Series` (DatetimeIndex; rows failing QA or holding fill values → dropped).
- Produces: `@dataclass Agreement(status: str, value: float | None, n_months: int, period: str)`; `anomaly_agreement(model: pd.Series, obs: pd.Series, min_months: int = 24) -> Agreement`. Monthly means → subtract each calendar month's mean → Spearman (rank, then Pearson) on overlapping months. `n_months < min_months` → `not-available`; r ≥ 0.5 `consistent`; 0.3 ≤ r < 0.5 `weak`; r < 0.3 `inconsistent` (thresholds: mentor question 2).
- AppEEARS request (person with Earthdata Login, **in the first 2 hours**): point sample at the pilot site, `SPL3SMP_E.006` soil moisture (AM) with its retrieval QA layer, 2015-04-01 → 2025-12-31, CSV output; same request adds `MOD13Q1.061` NDVI + pixel reliability (Task 11) and `SRTMGL1_NC.003` elevation.

- [ ] **Step 1: Write the failing tests**

```python
def test_correlated_series_consistent():
    m = seasonal_series(seed=1); o = m + noise(0.05)
    assert anomaly_agreement(m, o).status == "consistent"
def test_unrelated_series_inconsistent():
    assert anomaly_agreement(seasonal_series(1), seasonal_series(2)).status in {"inconsistent", "weak"}
def test_too_short_is_not_available():
    a = anomaly_agreement(monthly(n=12), monthly(n=12)); assert a.status == "not-available" and a.value is None
def test_qa_failures_and_fill_dropped(csv_fixture):
    s = load_point_csv(csv_fixture, layer="Soil_Moisture_Retrieval_Data_AM_soil_moisture", qa_layer=..., good_qa={0})
    assert s.notna().all() and (s >= 0).all()
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5:** Wire into Task 9 (`appeears_dir`), compare against the current rotation's **rainfed** `rel_moisture`, and commit.
  - The rainfed run checks the rain forcing.
  - The 9 km pixel in western Kansas mixes center pivots and dryland, and `validation.note` must say so.

---

### Task 11: NDVI crop calendar and bare windows (Should)

**Files:**
- Create: `pipeline/src/fieldshift/domain/phenology.py`
- Test: `pipeline/tests/test_phenology.py`

**Interfaces:**
- Consumes: an NDVI `pd.Series` (16-day MOD13Q1 from the AppEEARS CSV via `load_point_csv`).
- Produces: `@dataclass Season(plant: date, peak: date, harvest: date)`, `@dataclass Window(start: date, end: date, days: int)`; `detect_seasons(ndvi: pd.Series, min_amplitude: float = 0.15, threshold_frac: float = 0.5, max_gap_days: int = 48) -> list[Season]`; `bare_windows(ndvi: pd.Series, seasons: list[Season], min_days: int = 21) -> list[Window]`; `fit_cover_crops(window: Window, tmin_c: pd.Series, candidates: dict[str, tuple[int, bool]]) -> list[str]` (`(days_needed, frost_tolerant)`; a frost day is `tmin_c < 0`).
- Algorithm: resample daily; interpolate only gaps ≤ `max_gap_days` (longer gaps stay NaN and split the series); smooth with a centred 3-composite rolling median; a season is a local max at least `min_amplitude` above both neighbouring minima. Plant / harvest are the up / down crossings of `min + threshold_frac × amplitude`. A bare window is a run below `min + 0.25 × amplitude` lasting ≥ `min_days`.

- [ ] **Step 1: Write the failing tests**

```python
def test_two_synthetic_seasons_found_within_16_days():   # base 0.2, amplitude 0.5, peaks 2020-01-15 and 2021-01-15, 16-day samples
    s, truth = two_humps()
    found = detect_seasons(s)
    assert len(found) == 2 and all(abs((f.plant - t.plant).days) <= 16 and abs((f.harvest - t.harvest).days) <= 16 for f, t in zip(found, truth))

def test_flat_series_has_no_season():  assert detect_seasons(flat(0.2)) == []

def test_long_cloud_gap_does_not_create_a_season():
    s, _ = two_humps(); s[s.index.to_series().between("2020-12-05", "2021-02-23")] = np.nan   # 80 days over peak 2
    assert len(detect_seasons(s)) == 1

def test_bare_window_between_seasons():
    s, truth = two_humps(); w = bare_windows(s, detect_seasons(s))
    assert any(truth[0].harvest <= x.start and x.end <= truth[1].plant and x.days >= 21 for x in w)
def test_frost_excludes_sensitive_cover():
    assert fit_cover_crops(Window(d(2024,10,15), d(2025,4,20), 187), tmin_with_frost(), {"cereal_rye": (120, True), "soybean": (100, False)}) == ["cereal_rye"]
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5:** Wire into Task 9 (`calendar.status = "detected"`) and commit.

---

### Task 12: Relative erosion index (Should)

**Files:**
- Create: `pipeline/src/fieldshift/domain/erosion.py`
- Test: `pipeline/tests/test_erosion.py`

**Interfaces:**
- Produces: `cover_factor(schedule: pd.DataFrame) -> pd.Series`, where C = 1.0 when bare and, in crop, `max(0.1, 1 − 0.9·f)` with `f = clip((kc − 0.3)/(kc_mid − 0.3), 0, 1)`. Produces `erosion_index(precip_mm: pd.Series, c: pd.Series, slope_pct: float, k_factor: float) -> float`: Σ over days with P ≥ 12.7 mm of `P**1.81 × C`, × `k_factor` × S, where S is McCool (θ = atan(slope/100); S = 10.8·sinθ + 0.03 if slope < 9 %, else 16.8·sinθ − 0.50), divided by 1e4. **A relative index for comparing rotations at one site; never shown in t/ha.**

- [ ] **Step 1: Write the failing tests** — no rain → 0; doubling `C` on erosive days doubles the index; slope 15 % > slope 3 %; rain < 12.7 mm contributes nothing.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5:** Add `erosion_index` per campaign in Task 6's metrics via Task 9 and commit.

---

### Task 13: Web — story page, tool page, ficha rendering

**Files:**
- Create: `web/src/lib/ficha.ts`, `web/src/lib/ficha.test.ts`, `web/src/components/Matrix.astro`, `web/src/components/RotationCard.astro`, `web/src/components/SiteMap.ts` (MapLibre island), `web/src/layouts/Base.astro`, `web/src/pages/tool.astro`, `web/tests/e2e/tool.spec.ts`
- Modify: `web/src/pages/index.astro` (story page), `web/package.json` (scripts `test`, `test:e2e`; dev deps `vitest`, `@playwright/test`; deps `maplibre-gl`, `@observablehq/plot`)
- Create (copy once, commit): `contracts/examples/example-ficha.json` → `web/public/data/fichas/example-synthetic.json`, used until Task 9 ships the real pilot ficha

**Interfaces:**
- Consumes: the JSON shape of `contracts/ficha.schema.json` (no pipeline code).
- Produces:
  - `type Ficha` (hand-written to mirror schema v0.2.0) and `type YearType = "dry" | "normal" | "wet"`.
  - `loadFicha(siteId: string): Promise<Ficha>`, which fetches `/data/fichas/${siteId}.json`.
  - `isSynthetic(f: Ficha): boolean`.
  - `matrixGrid(f: Ficha): { rotation: Rotation; cells: Record<YearType, Cell | null> }[]`, current rotation first.
  - `formatBand(b: Band | null, unit: string): string` → `"30 (24–36) days"`, or `"no data"` for `null`.
  - US-unit formatters (presentation only):
    - `m3haToInches(v)`: mm = m³/ha ÷ 10, inches = mm ÷ 25.4. Shown as "in/acre", i.e. acre-inches per acre.
    - `doyToDate(doy)`: "Apr 23", using a non-leap year.
    - `cToF(c)`.
  - `rankByPriorities(f: Ficha, priorities: Priority[]): Rotation[]`: orders by the count of `better` minus `worse` over the chosen priorities, with the current rotation pinned first.

- [ ] **Step 1: Write the failing unit tests** (`ficha.test.ts`, Vitest, using the example JSON)

```ts
test("grid is 4x3 with current first", () => { const g = matrixGrid(ex); expect(g).toHaveLength(4); expect(g[0].rotation.is_current).toBe(true); expect(Object.values(g[0].cells).every(Boolean)).toBe(true); });
test("missing cell is null, not zero", () => { const f = structuredClone(ex); f.matrix = f.matrix.slice(1); expect(matrixGrid(f)[0].cells.dry).toBeNull(); });
test("synthetic flag", () => expect(isSynthetic(ex)).toBe(true));
test("band format", () => expect(formatBand({ p10: 24, p50: 30, p90: 36 }, "days")).toBe("30 (24–36) days"));
test("null band reads no data", () => expect(formatBand(null, "days")).toBe("no data"));
test("us units", () => { expect(m3haToInches(254)).toBeCloseTo(1.0, 3); expect(doyToDate(113)).toBe("Apr 23"); expect(cToF(10)).toBe(50); });
test("priority ranking keeps current first", () => expect(rankByPriorities(ex, ["n_fixing"])[0].is_current).toBe(true));
```

- [ ] **Step 2: Run** `cd web && pnpm test` → FAIL. **Step 3: Implement `ficha.ts`.** **Step 4: Run** → PASS.
- [ ] **Step 5: Pages.** `tool.astro` shows:
  - a field map: MapLibre, free basemap, no API key;
  - a **planting window** strip that leads with `planting.all_years`, e.g. "Typically ready to plant Apr 23 (Apr 17–Apr 29); last spring frost Apr 24 (Apr 14–May 4)". The `by_year_type` rows sit underneath as context, with the rule and its MERRA-2 caveat;
  - the matrix:
    - rows = rotations, columns = Dry / Normal / Wet years;
    - per cell: stress if not irrigated, critical-stage (VT–R1) stress with `n_corn_years`, irrigation need in inches, and bare days;
    - for `irrigated: false` rotations, the irrigation value reads "Not irrigated — would need X in/acre to avoid stress", visually muted. It must never look like water used;
    - p50 large, band small;
    - a confidence badge with the reason on hover or tap;
    - `null` shows "no data";
  - one `RotationCard` per rotation with why / evidence / benefits / gaps / risks;
  - priority toggles that call `rankByPriorities`;
  - the validation note;
  - the disclaimer.

  A red "SYNTHETIC EXAMPLE" banner shows whenever `isSynthetic`. `index.astro` holds the story (narrative from Camila). The year-type colour scale must be colour-blind-safe (dry orange `#D9822B` ↔ wet teal `#1F8A8A`, normal grey), not red/green.
- [ ] **Step 6: E2E smoke** (`tool.spec.ts`, Playwright Chromium). Check that:
  - `/tool` loads;
  - 12 matrix cells are present for the example;
  - the planting strip shows the all-years band and 3 year-type rows;
  - the dryland rotation row shows "Not irrigated";
  - the disclaimer is visible;
  - no `input[type=password]` exists;
  - there are no console errors.

  Run `pnpm build && pnpm test:e2e` → PASS.
- [ ] **Step 7: Commit.**

---

### Task 14: Deploy and public-access check

**Files:**
- Modify: `README.md` (live URL), `docs/submission/SUBMISSION-COMPLIANCE.md` (tick items)

**Interfaces:**
- Consumes: `firebase.json` (hosting `web/dist`), a built `web/dist`.

- [ ] **Step 1:** `pnpm dlx firebase-tools login` (Richard's Google account, which owns project `field-shift-datacorn`, Spark plan). `.firebaserc` already points at it.
- [ ] **Step 2:** `cd web && pnpm build && cd .. && pnpm dlx firebase-tools deploy --only hosting` → prints `Hosting URL: https://field-shift-datacorn.web.app`.
- [ ] **Step 3: Verify public access without credentials**: `curl.exe -s -o NUL -w "%{http_code}" https://field-shift-datacorn.web.app/tool` → `200`; same for `/data/fichas/<site>.json` → `200`. Then open both in a private window on a phone outside the team network.
- [ ] **Step 4: Commit** the README URL. Redeploy after every merged Task 9 regeneration.

---

### Task 15: GRACE / GRACE-FO regional water context (Should)

**Files:**
- Create: `pipeline/src/fieldshift/adapters/grace.py`, `pipeline/src/fieldshift/domain/grace.py`
- Modify: `pipeline/pyproject.toml` (optional extra `grace = ["xarray", "h5netcdf"]`, Should only; the Must path never imports it)
- Test: `pipeline/tests/test_grace.py`

**Interfaces:**
- Consumes: the JPL GRACE/GRACE-FO mascon grid through `earthaccess` (Earthdata Login).
  - Product `TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4`; **verify the short name in Earthdata Search before coding**.
  - The variable is `lwe_thickness` in cm, monthly from 2002.
  - The 2017-07 → 2018-05 gap between missions stays a gap.
- Produces: `cell_series(ds, lat, lon) -> pd.Series`, the monthly TWS anomaly in cm at the nearest grid cell.
- Produces: `linear_trend_cm_per_year(s: pd.Series) -> float | None`, by least squares on the non-NaN months. Returns `None` when there are fewer than 60 months. The gap is never interpolated.
- Produces: `water_context_block(s: pd.Series, product_id: str) -> dict`, the schema `water_context`. Its `note` always says it is regional (~300 km) and not about one field or well.

- [ ] **Step 1: Write the failing tests**

```python
def test_trend_of_a_linear_series():
    s = monthly(2003, 2022, slope_cm_per_year=-1.5); assert linear_trend_cm_per_year(s) == pytest.approx(-1.5, abs=1e-6)
def test_mission_gap_is_not_filled():
    s = monthly(2003, 2022, slope_cm_per_year=-1.5); s["2017-07":"2018-05"] = np.nan
    assert water_context_block(s, "X")["series"][s.index.get_loc(pd.Timestamp("2017-08-01"))]["tws_anomaly_cm"] is None
def test_short_series_has_no_trend():  assert linear_trend_cm_per_year(monthly(2003, 2005, 0.0)) is None
def test_note_says_regional():         assert "regional" in water_context_block(monthly(2003, 2022, 0.0), "X")["note"]
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5:** Wire it into Task 9 as an optional input. The web shows one small "Regional water storage" chart with its caption. Commit, adding the GRACE row to REFERENCES.
