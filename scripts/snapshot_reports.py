#!/usr/bin/env python3
"""Genera informes reales precalculados del campo de ejemplo (#53).

Llama al API local (por defecto http://localhost:8080) y guarda en
apps/web/public/data/snapshots/sample.json lo que devuelven /fields/describe y
/fields/analyze, una vez por sistema de riego. La web hospedada los muestra sin API.

Uso: python3 scripts/snapshot_reports.py [--api URL] [--season 2027]
"""

from __future__ import annotations

import argparse
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# Mismo campo que SAMPLE_FIELD en apps/web/src/infrastructure/mapStyle.ts
RING = [[-98.004, 40.9], [-97.994, 40.9], [-97.994, 40.9073], [-98.004, 40.9073], [-98.004, 40.9]]
GEOMETRY = {"type": "Polygon", "coordinates": [RING]}
IRRIGATION = ["none", "pivot", "furrow", "drip"]
OUT = Path(__file__).resolve().parent.parent / "apps/web/public/data/snapshots/sample.json"


def post(api: str, path: str, body: dict) -> dict:
    req = urllib.request.Request(
        f"{api}/api/v1{path}",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=300) as response:
        return json.load(response)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", default="http://localhost:8080")
    parser.add_argument("--season", type=int, default=2027)
    args = parser.parse_args()

    described = post(args.api, "/fields/describe", {"geometry": GEOMETRY, "season": args.season})
    defaults = described["defaults"]
    reports = {}
    for irrigation in IRRIGATION:
        values = {
            "season": args.season,
            "planting_date": f"{args.season}-{defaults['planting_date'][5:10]}",
            "hybrid_rm_days": defaults["hybrid_rm_days"],
            "irrigation": irrigation,
            "irrigation_capacity_mm_day": None,
            "tillage": "conventional",
            "yield_goal_t_ha": defaults["yield_goal_t_ha"],
            "previous_crop": None,
        }
        reports[irrigation] = post(args.api, "/fields/analyze", {"geometry": GEOMETRY, **values})
        print(f"analyze {irrigation}: ok")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "season": args.season,
                "describe": described,
                "reports": reports,
            },
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
