# SI-assisted (Claude Code); reviewed by <name>
"""Probe the data sources behind Field Shift: one small, read-only request each (#16).

Every probe prints what it asked and the facts docs/DATA-SOURCES.md records: counts, dates,
versions. Standard library only, no account and no key. The sources that need one (Earth Engine,
NASS QuickStats, Google Map Tiles) are listed at the end as not probed.

  python scripts/probe_sources.py                    all probes
  python scripts/probe_sources.py power ssurgo       only these
  python scripts/probe_sources.py --list             the names

Exit code 1 if a probe fails. A failure is a fact about the service on that day, not always a bug.

Trust store: the app's HTTP client (httpx) checks certificates against certifi. This script does the
same when certifi is importable, so run it with the API environment to get the app's view:
`cd apps/api && uv run python ../../scripts/probe_sources.py`. With a bare Windows Python, hosts
whose chain ends in a root that machine has not installed yet (ORNL, GMU) fail the TLS check.
"""

from __future__ import annotations

import argparse
import json
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date

LON, LAT = -100.44, 39.36  # the pilot point of the register (Sheridan County, Kansas)
X5070, Y5070 = -378937.3, 1824112.0  # the same point in EPSG:5070, from cropscape.albers_conus
USER_AGENT = "field-shift-source-probe"
# The eight parameters the adapter requests (apps/api/.../infrastructure/power.py), then TSOIL1,
# which the original plan listed and the adapter does not request.
POWER_PARAMETERS = "T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M,WS2M,GWETROOT,GWETTOP,TSOIL1"
FILL = -999.0
SOLAR_STARTS = "19840101"  # per the POWER documentation, ALLSKY_SFC_SW_DWN starts here

# The layers of apps/web/src/infrastructure/gibs.ts, each at a date inside its range.
GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best"
GIBS_LAYERS = (
    ("BlueMarble_ShadedRelief_Bathymetry", "GoogleMapsCompatible_Level8", "2004-08-01", "jpeg"),
    ("SMAP_L4_Analyzed_Root_Zone_Soil_Moisture", "GoogleMapsCompatible_Level6", "2026-10-15", "png"),
    ("IMERG_Precipitation_Rate", "GoogleMapsCompatible_Level6", "2026-10-15", "png"),
    ("MODIS_Terra_L3_Land_Surface_Temp_Monthly_Day", "GoogleMapsCompatible_Level6", "2026-09-01", "png"),
    ("MODIS_Terra_L3_NDVI_Monthly", "GoogleMapsCompatible_Level7", "2026-09-01", "png"),
)
# (short name, version) of the NASA products named in docs/REFERENCES.md and the region profiles.
CMR_PRODUCTS = (
    ("SPL3SMP_E", "006"),
    ("SPL4SMGP", "008"),
    ("MOD13Q1", "061"),
    ("SRTMGL1_NC", "003"),
    ("NASADEM_HGT", "001"),
    ("GPM_3IMERGDF", "07"),
    ("HLSL30", "2.0"),
    ("HLSS30", "2.0"),
    ("TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4", "4.0"),
)
SSURGO_SQL = (
    "SELECT mu.mukey, mu.muname, c.compname, c.comppct_r, ch.hzdept_r, ch.hzdepb_r, "
    "ch.sandtotal_r, ch.claytotal_r, ch.om_r, ch.awc_r "
    "FROM mapunit mu INNER JOIN component c ON c.mukey = mu.mukey "
    "INNER JOIN chorizon ch ON ch.cokey = c.cokey "
    f"WHERE mu.mukey IN (SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('point({LON} {LAT})')) "
    "AND c.majcompflag = 'Yes' ORDER BY c.comppct_r DESC, ch.hzdept_r"
)
NOT_PROBED = (
    "Earth Engine adapters (SMAP L4, NASADEM, HLS, Sentinel-2, PRISM, ERA5-Land, OpenET): need an account",
    "USDA NASS QuickStats: needs a free key (DATACORN_NASS_API_KEY)",
    "Google Map Tiles API: needs a key (PUBLIC_GOOGLE_MAPS_KEY)",
)


@dataclass(frozen=True)
class Outcome:
    ok: bool
    lines: list[str]


# --- pure helpers (tested in apps/api/tests/unit/test_probe_sources.py) ------------------------


def power_report(data: dict) -> list[str]:
    """Header and per-parameter counts of a POWER daily point response."""
    header = data.get("header", {})
    units = data.get("parameters", {})
    coordinates = data.get("geometry", {}).get("coordinates", [])
    elevation = f", elevation {coordinates[2]} m" if len(coordinates) > 2 else ""
    lines = [
        f"API {header.get('api', {}).get('version', '?')}, {header.get('title', '?')}, "
        f"sources {header.get('sources', '?')}, fill value {header.get('fill_value', '?')}{elevation}"
    ]
    for name, values in data["properties"]["parameter"].items():
        valid = sorted(day for day, value in values.items() if value != FILL)
        before_solar = sum(1 for day, value in values.items() if value == FILL and day < SOLAR_STARTS)
        found = [value for value in values.values() if value != FILL]
        span = f", range {min(found):.4g} to {max(found):.4g}" if found else ""
        about = units.get(name, {})
        lines.append(
            f"{name} ({about.get('units', '?')}, {about.get('longname', '?')}): {len(values)} days, "
            f"{len(values) - len(valid)} fill ({before_solar} before 1984), "
            f"valid {valid[0] if valid else 'none'} to {valid[-1] if valid else 'none'}{span}"
        )
    return lines


def depth_weighted_awc(
    horizons: list[tuple[float, float, float | None]], limit: float = 150.0
) -> tuple[float | None, float]:
    """Mean awc_r over the depth the horizons cover down to `limit` cm, and the cm covered."""
    covered = total = 0.0
    for top, bottom, awc in horizons:
        thickness = max(0.0, min(bottom, limit) - min(top, limit))
        if awc is not None and thickness > 0:
            covered += thickness
            total += awc * thickness
    return (total / covered if covered else None), covered


def ssurgo_report(table: list[list]) -> list[str]:
    """Horizons of each major component at the point: depth reached, gaps, missing awc_r."""
    header, *rows = table
    col = {name: i for i, name in enumerate(header)}

    def number(row: list, name: str) -> float | None:
        raw = row[col[name]]
        return None if raw in (None, "") else float(raw)

    components: dict[tuple[str, float], list[tuple[float, float, float | None]]] = {}
    mapunit = ""
    for row in rows:
        mapunit = str(row[col["muname"]])
        key = (str(row[col["compname"]]), number(row, "comppct_r") or 0.0)
        top, bottom = number(row, "hzdept_r"), number(row, "hzdepb_r")
        components.setdefault(key, []).append((top or 0.0, bottom or 0.0, number(row, "awc_r")))
    lines = [f"map unit: {mapunit}"] if rows else ["no rows: the point is not covered"]
    for (name, pct), horizons in components.items():
        horizons.sort()
        gaps = sum(1 for a, b in zip(horizons, horizons[1:], strict=False) if b[0] > a[1])
        missing = sum(1 for _, _, awc in horizons if awc is None)
        mean, covered = depth_weighted_awc(horizons)
        taw = f"{mean * 1000:.0f} mm/m over {covered:.0f} of 150 cm" if mean is not None else "no awc_r"
        lines.append(
            f"{name} ({pct:.0f}%): {len(horizons)} horizons to {horizons[-1][1]:.0f} cm, "
            f"{gaps} gaps, awc_r missing in {missing}, TAW {taw}"
        )
    return lines


def parse_oni(text: str) -> list[tuple[str, int, float]]:
    """(season, year, anomaly) rows of NOAA's oni.ascii.txt."""
    rows = []
    for line in text.splitlines():
        parts = line.split()
        if len(parts) == 4 and parts[1].isdigit():
            rows.append((parts[0], int(parts[1]), float(parts[3])))
    return rows


def cmr_line(short_name: str, version: str, feed: dict) -> tuple[bool, str]:
    """Whether the NASA CMR lists `short_name`, and what it says about it."""
    entries = [e for e in feed.get("feed", {}).get("entry", []) if e.get("short_name") == short_name]
    if not entries:
        return False, f"{short_name} v{version}: NOT FOUND in the CMR"
    e = entries[0]
    span = f"{str(e.get('time_start', '?'))[:10]} to {str(e.get('time_end', 'ongoing'))[:10]}"
    return True, f"{short_name} v{e.get('version_id', '?')}: {e.get('data_center', '?')}, {span}"


# --- requests -----------------------------------------------------------------------------


def tls_context() -> ssl.SSLContext:
    """certifi's CA bundle when it is installed (what httpx uses), else the system one."""
    try:
        import certifi
    except ImportError:
        return ssl.create_default_context()
    return ssl.create_default_context(cafile=certifi.where())


def fetch(url: str, *, body: dict | None = None, timeout: int = 60) -> tuple[int, str, bytes]:
    """(status, content type, bytes). Raises on network errors and on HTTP errors."""
    headers = {"User-Agent": USER_AGENT, "Accept": "*/*"}
    data = json.dumps(body).encode() if body is not None else None
    if data is not None:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(request, timeout=timeout, context=tls_context()) as response:
        return response.status, response.headers.get("Content-Type", ""), response.read()


def get_json(url: str, **kwargs: object) -> dict:
    return json.loads(fetch(url, **kwargs)[2])  # type: ignore[arg-type]


def query(base: str, params: dict[str, object]) -> str:
    return f"{base}?{urllib.parse.urlencode(params)}"


# --- probes ---------------------------------------------------------------------------------


def probe_power() -> Outcome:
    url = query(
        "https://power.larc.nasa.gov/api/temporal/daily/point",
        {
            "parameters": POWER_PARAMETERS,
            "community": "AG",
            "longitude": LON,
            "latitude": LAT,
            "start": "19810101",
            "end": "20251231",
            "format": "JSON",
        },
    )
    return Outcome(True, power_report(get_json(url, timeout=180)))


def probe_ssurgo() -> Outcome:
    url = "https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest"
    table = get_json(url, body={"query": SSURGO_SQL, "format": "JSON+COLUMNNAME"}).get("Table", [])
    return Outcome(bool(table), ssurgo_report(table) if table else ["empty answer"])


def probe_cropscape() -> Outcome:
    lines, ok = [], True
    for year in (2023, 2024):
        url = query(
            "https://nassgeodata.gmu.edu/axis2/services/CDLService/GetCDLValue",
            {"year": year, "x": X5070, "y": Y5070},
        )
        status, _, body = fetch(url, timeout=30)
        text = " ".join(body.decode("utf-8", "replace").split())
        lines.append(f"CDL {year}: HTTP {status}, {text[-110:]}")
        ok = ok and status == 200
    return Outcome(ok, lines)


def probe_fcc() -> Outcome:
    url = query(
        "https://geo.fcc.gov/api/census/area",
        {"lat": LAT, "lon": LON, "censusYear": 2020, "format": "json"},
    )
    results = get_json(url, timeout=30).get("results", [])
    row = results[0] if results else {}
    return Outcome(bool(row), [f"state {row.get('state_code')}, county {row.get('county_name')}"])


def probe_oni() -> Outcome:
    _, _, body = fetch("https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt", timeout=30)
    rows = parse_oni(body.decode("utf-8", "replace"))
    first, last = rows[0], rows[-1]
    return Outcome(
        bool(rows),
        [f"{len(rows)} seasons, {first[0]} {first[1]} to {last[0]} {last[1]}, last anomaly {last[2]:+.1f}"],
    )


def probe_modis() -> Outcome:
    start, end = date(2025, 5, 1), date(2025, 7, 31)
    url = query(
        "https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset",
        {
            "latitude": f"{LAT:.5f}",
            "longitude": f"{LON:.5f}",
            "band": "250m_16_days_NDVI",
            "startDate": f"A{start.year}{start.timetuple().tm_yday:03d}",
            "endDate": f"A{end.year}{end.timetuple().tm_yday:03d}",
            "kmAboveBelow": 0,
            "kmLeftRight": 0,
        },
    )
    subset = get_json(url, timeout=120).get("subset", [])
    ndvi = [round(item["data"][0] * 0.0001, 2) for item in subset if item["data"][0] > -2000]
    return Outcome(bool(ndvi), [f"{len(subset)} composites {start} to {end}, NDVI {ndvi}"])


def probe_soilgrids() -> Outcome:
    params = [("lon", f"{LON:.5f}"), ("lat", f"{LAT:.5f}"), ("value", "mean")]
    params += [("property", p) for p in ("sand", "clay", "soc")]
    params += [("depth", d) for d in ("0-5cm", "5-15cm", "15-30cm")]
    layers = get_json(
        "https://rest.isric.org/soilgrids/v2.0/properties/query?" + urllib.parse.urlencode(params), timeout=60
    )
    names = [layer["name"] for layer in layers.get("properties", {}).get("layers", [])]
    return Outcome(bool(names), [f"layers {names}"])


def probe_gibs() -> Outcome:
    lines, ok = [], True
    for layer, matrix, day, ext in GIBS_LAYERS:
        url = f"{GIBS}/{layer}/default/{day}/{matrix}/3/3/1.{ext}"  # the tile over the pilot point
        try:
            status, kind, body = fetch(url, timeout=30)
            good = status == 200 and kind.startswith("image/")
            lines.append(f"{layer} {day}: HTTP {status}, {kind}, {len(body)} bytes")
        except urllib.error.URLError as error:
            good = False
            lines.append(f"{layer} {day}: {error}")
        ok = ok and good
    return Outcome(ok, lines)


def probe_eox() -> Outcome:
    url = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/3/3/1.jpg"
    status, kind, body = fetch(url, timeout=30)
    return Outcome(status == 200 and kind.startswith("image/"), [f"HTTP {status}, {kind}, {len(body)} bytes"])


def probe_nominatim() -> Outcome:
    url = query(
        "https://nominatim.openstreetmap.org/search", {"format": "json", "q": "Selden Kansas", "limit": 1}
    )
    rows = get_json(url, timeout=30)
    return Outcome(bool(rows), [f"{len(rows)} result: {rows[0]['display_name'][:70] if rows else '-'}"])


def probe_stac() -> Outcome:
    root = get_json("https://planetarycomputer.microsoft.com/api/stac/v1", timeout=30)
    return Outcome("id" in root or "title" in root, [f"catalogue {root.get('title', root.get('id'))}"])


def probe_cmr() -> Outcome:
    lines, ok = [], True
    for short_name, version in CMR_PRODUCTS:
        url = query(
            "https://cmr.earthdata.nasa.gov/search/collections.json",
            {"short_name": short_name, "page_size": 5},
        )
        found, line = cmr_line(short_name, version, get_json(url, timeout=30))
        lines.append(line)
        ok = ok and found
    return Outcome(ok, lines)


PROBES: dict[str, tuple[str, Callable[[], Outcome]]] = {
    "power": ("NASA POWER daily point, 1981-2025, the app's 8 parameters and TSOIL1", probe_power),
    "ssurgo": ("USDA Soil Data Access, SSURGO horizons at the point", probe_ssurgo),
    "cropscape": ("USDA NASS CropScape, crop of two years at the point", probe_cropscape),
    "fcc": ("FCC Census Area API, state and county", probe_fcc),
    "oni": ("NOAA CPC Oceanic Nino Index", probe_oni),
    "modis": ("MODIS MOD13Q1 NDVI through the ORNL DAAC service", probe_modis),
    "soilgrids": ("ISRIC SoilGrids REST", probe_soilgrids),
    "gibs": ("NASA GIBS tiles of the five web layers", probe_gibs),
    "eox": ("EOX Sentinel-2 cloudless 2024 tile", probe_eox),
    "nominatim": ("OpenStreetMap Nominatim place search", probe_nominatim),
    "stac": ("Microsoft Planetary Computer STAC root", probe_stac),
    "cmr": ("NASA CMR: the product names in REFERENCES.md", probe_cmr),
}


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Probe the Field Shift data sources (read-only).")
    parser.add_argument("names", nargs="*", help=f"probes to run ({', '.join(PROBES)}); default all")
    parser.add_argument("--list", action="store_true", help="print the probe names and stop")
    args = parser.parse_args(argv)
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if args.list:
        for name, (title, _) in PROBES.items():
            print(f"{name:<10} {title}")
        return 0
    unknown = [n for n in args.names if n not in PROBES]
    if unknown:
        parser.error(f"unknown probe: {', '.join(unknown)}")

    print(f"Pilot point {LAT}, {LON}; run on {date.today()}\n")
    failed = 0
    for name in args.names or list(PROBES):
        title, probe = PROBES[name]
        started = time.monotonic()
        try:
            outcome = probe()
        except (urllib.error.URLError, TimeoutError, OSError, ValueError, KeyError, IndexError) as error:
            outcome = Outcome(False, [f"{type(error).__name__}: {error}"])
        failed += not outcome.ok
        print(f"{'OK  ' if outcome.ok else 'FAIL'} {name:<10} {time.monotonic() - started:5.1f}s  {title}")
        for line in outcome.lines:
            print(f"       {line}")
    print("\nNot probed:")
    for line in NOT_PROBED:
        print(f"  - {line}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
