# SI-assisted (Claude Code); reviewed by <name>
"""Precalcula los reportes de los lotes de ejemplo para la web estática (issue #53).

    python -m datacorn.interfaces.cli.precompute --out ../web/public/data/reports

Por cada lote de `resources/demo/fields.json` llama a los mismos casos de uso que la API
(describe y analyze) con los valores por defecto del formulario y escribe `<id>.json` con las
dos respuestas tal como las devuelve la API, más `index.json`. No calcula nada propio.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from pydantic import TypeAdapter

from datacorn.application.dto import DescribeFieldResult
from datacorn.application.ports import DemoField
from datacorn.bootstrap import Container, build_container
from datacorn.config import Settings
from datacorn.domain.models import IrrigationSystem
from datacorn.domain.report import FieldReport
from datacorn.interfaces.http.schemas import AnalyzeFieldRequest, PolygonGeometry

_DESCRIBE = TypeAdapter(DescribeFieldResult)
_REPORT = TypeAdapter(FieldReport)


@dataclass(frozen=True, slots=True)
class Failure:
    field_id: str
    reason: str


def default_season(today: date) -> int:
    """Misma regla que la web: desde julio se planifica la campaña del año siguiente."""
    return today.year + 1 if today.month >= 7 else today.year


def _with_year(iso: str, year: int) -> str:
    month_day = iso[5:10]
    return f"{year}-{'02-28' if month_day == '02-29' else month_day}"


def git_commit() -> str | None:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "HEAD"], capture_output=True, text=True, check=True, timeout=10
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return out.stdout.strip() or None


def _write(path: Path, payload: Any) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=1, allow_nan=False)
    path.write_text(text + "\n", encoding="utf-8")


def _compute(container: Container, field: DemoField, season: int) -> dict[str, Any]:
    polygon = PolygonGeometry.model_validate(dict(field.geometry))
    described = container.describe_field.execute(polygon.to_domain(), season=season)
    defaults = described.defaults
    request = AnalyzeFieldRequest(
        geometry=polygon,
        season=season,
        planting_date=date.fromisoformat(_with_year(defaults.planting_date.isoformat(), season)),
        hybrid_rm_days=defaults.hybrid_rm_days,
        irrigation=IrrigationSystem.NONE,
        yield_goal_t_ha=defaults.yield_goal_t_ha,
    )
    report = container.analyze_field.execute(request.to_command())
    return {
        "describe": _DESCRIBE.dump_python(described, mode="json"),
        "analyze": _REPORT.dump_python(report, mode="json"),
    }


def precompute(
    container: Container,
    out_dir: Path,
    *,
    now: datetime | None = None,
    commit: str | None = None,
    retries: int = 1,
    only: Sequence[str] = (),
) -> tuple[list[dict[str, Any]], list[Failure]]:
    """Escribe un JSON por lote y el índice. Devuelve las entradas escritas y los fallos."""
    now = now or datetime.now(UTC)
    generated_at = now.replace(microsecond=0).isoformat()
    season = default_season(now.date())
    out_dir.mkdir(parents=True, exist_ok=True)

    entries: list[dict[str, Any]] = []
    failures: list[Failure] = []
    for field in container.list_demo_fields.execute():
        if only and field.id not in only:
            continue
        for attempt in range(retries + 1):
            try:
                body = _compute(container, field, season)
                break
            except Exception as exc:  # un servicio caído no debe tumbar a los otros lotes
                if attempt == retries:
                    failures.append(Failure(field.id, f"{type(exc).__name__}: {exc}"))
                    body = None
        if body is None:
            continue
        meta = {
            "id": field.id,
            "name": dict(field.name),
            "generated_at": generated_at,
            "engine_commit": commit,
        }
        _write(out_dir / f"{field.id}.json", {**meta, "season": season, **body})
        entries.append(meta | {"file": f"{field.id}.json"})

    _write(out_dir / "index.json", {"generated_at": generated_at, "engine_commit": commit, "fields": entries})
    return entries, failures


def main(
    argv: Sequence[str] | None = None,
    *,
    container_factory: Callable[[], Container] | None = None,
) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, required=True, help="directory for the JSON files")
    parser.add_argument("--only", nargs="*", default=[], help="field ids to compute (default: all)")
    args = parser.parse_args(argv)

    container = (container_factory or (lambda: build_container(Settings())))()
    entries, failures = precompute(container, args.out, commit=git_commit(), only=args.only)
    for entry in entries:
        print(f"ok   {entry['id']} -> {args.out / entry['file']}")
    for failure in failures:
        print(f"FAIL {failure.field_id}: {failure.reason}", file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
