"""La regla de dependencias de clean architecture, verificada en cada `pytest`."""

from __future__ import annotations

import ast
from pathlib import Path

import pytest

SRC = Path(__file__).resolve().parents[2] / "src" / "datacorn"

FORBIDDEN = {
    "domain": (
        "datacorn.application",
        "datacorn.infrastructure",
        "datacorn.interfaces",
        "datacorn.bootstrap",
        "datacorn.config",
        "ee",
        "fastapi",
        "httpx",
        "pydantic",
        "google",
        "yaml",
    ),
    "application": (
        "datacorn.infrastructure",
        "datacorn.interfaces",
        "datacorn.bootstrap",
        "ee",
        "fastapi",
        "httpx",
        "google",
    ),
}


def _imports(path: Path) -> set[str]:
    names: set[str] = set()
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            names.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            names.add(node.module)
    return names


@pytest.mark.parametrize("layer", sorted(FORBIDDEN))
def test_layer_does_not_import_outer_layers(layer: str) -> None:
    violations = []
    for path in (SRC / layer).rglob("*.py"):
        for name in _imports(path):
            if any(name == f or name.startswith(f + ".") for f in FORBIDDEN[layer]):
                violations.append(f"{path.relative_to(SRC)} imports {name}")
    assert not violations, "\n".join(violations)
