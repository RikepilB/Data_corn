# SI-assisted (Claude Code); reviewed by <name>
"""The pure helpers of scripts/probe_sources.py: how a response becomes the facts the register records."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[4] / "scripts" / "probe_sources.py"
_spec = importlib.util.spec_from_file_location("probe_sources", SCRIPT)
assert _spec is not None and _spec.loader is not None
probe = importlib.util.module_from_spec(_spec)
sys.modules["probe_sources"] = probe  # dataclasses looks the module up by name
_spec.loader.exec_module(probe)


def test_power_report_counts_fill_values_and_names_the_valid_range() -> None:
    data = {
        "header": {
            "api": {"version": "v2.5"},
            "title": "POWER daily",
            "sources": ["merra2"],
            "fill_value": -999.0,
        },
        "geometry": {"coordinates": [-100.44, 39.36, 884.3]},
        "parameters": {
            "ALLSKY_SFC_SW_DWN": {
                "units": "MJ/m^2/day",
                "longname": "All Sky Surface Shortwave Downward Irradiance",
            },
            "T2M_MAX": {"units": "C", "longname": "Temperature at 2 Meters Maximum"},
        },
        "properties": {
            "parameter": {
                "ALLSKY_SFC_SW_DWN": {"19831231": -999.0, "19840101": 12.5, "19840102": 13.0},
                "T2M_MAX": {"19831231": 3.0, "19840101": 4.0, "19840102": -999.0},
            }
        },
    }
    lines = probe.power_report(data)
    assert "v2.5" in lines[0] and "merra2" in lines[0] and "elevation 884.3 m" in lines[0]
    assert lines[1].startswith(
        "ALLSKY_SFC_SW_DWN (MJ/m^2/day, All Sky Surface Shortwave Downward Irradiance): "
    )
    assert lines[1].endswith("3 days, 1 fill (1 before 1984), valid 19840101 to 19840102, range 12.5 to 13")
    assert lines[2] == (
        "T2M_MAX (C, Temperature at 2 Meters Maximum): 3 days, 1 fill (0 before 1984), "
        "valid 19831231 to 19840101, range 3 to 4"
    )


def test_depth_weighted_awc_clips_at_the_limit_and_skips_missing_values() -> None:
    horizons = [(0.0, 50.0, 0.20), (50.0, 100.0, None), (100.0, 200.0, 0.10)]
    mean, covered = probe.depth_weighted_awc(horizons, limit=150.0)
    assert covered == 100.0  # 50 cm at 0.20 and 50 cm (100 to 150) at 0.10
    assert mean == pytest.approx(0.15)


def test_depth_weighted_awc_without_data_is_none() -> None:
    assert probe.depth_weighted_awc([(0.0, 30.0, None)]) == (None, 0.0)


def test_ssurgo_report_finds_gaps_and_missing_awc() -> None:
    header = ["mukey", "muname", "compname", "comppct_r", "hzdept_r", "hzdepb_r", "awc_r"]
    table = [
        header,
        ["1", "Keith silt loam", "Keith", "80", "0", "20", "0.21"],
        ["1", "Keith silt loam", "Keith", "80", "30", "150", None],  # gap 20-30, awc missing
    ]
    lines = probe.ssurgo_report(table)
    assert lines[0] == "map unit: Keith silt loam"
    assert "Keith (80%): 2 horizons to 150 cm, 1 gaps, awc_r missing in 1" in lines[1]
    assert "TAW 210 mm/m over 20 of 150 cm" in lines[1]


def test_ssurgo_report_says_when_the_point_is_not_covered() -> None:
    assert probe.ssurgo_report([["mukey"]]) == ["no rows: the point is not covered"]


def test_parse_oni_skips_the_header_and_reads_the_anomaly() -> None:
    text = "SEAS  YR   TOTAL  ANOM\nDJF 2025  26.0 -0.5\nJFM 2025  26.2 -0.3\n"
    assert probe.parse_oni(text) == [("DJF", 2025, -0.5), ("JFM", 2025, -0.3)]


def test_cmr_line_reports_found_and_missing() -> None:
    feed = {
        "feed": {
            "entry": [
                {
                    "short_name": "MOD13Q1",
                    "version_id": "061",
                    "data_center": "LPCLOUD",
                    "time_start": "2000-02-18T00:00:00Z",
                }
            ]
        }
    }
    found, line = probe.cmr_line("MOD13Q1", "061", feed)
    assert found and line == "MOD13Q1 v061: LPCLOUD, 2000-02-18 to ongoing"
    missing, line = probe.cmr_line("NOPE", "1", feed)
    assert not missing and "NOT FOUND" in line


def test_every_probe_has_a_title_and_a_function() -> None:
    assert probe.PROBES
    for name, (title, function) in probe.PROBES.items():
        assert title and callable(function), name
