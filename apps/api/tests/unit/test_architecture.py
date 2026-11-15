# SI-assisted (Claude Code); reviewed by <name>
"""La regla de dependencias de clean architecture, verificada en cada `pytest`."""

from __future__ import annotations

import ast
from pathlib import Path

import pytest

SRC = Path(__file__).resolve().parents[2] / "src" / "datacorn"

# The domain is pure FAO-56 and statistics: no network, no files.
_NETWORK_AND_FILES = (
    "requests",
    "urllib",
    "urllib3",
    "socket",
    "http",
    "aiohttp",
    "googleapiclient",
    "sqlite3",
    "shutil",
    "tempfile",
    "pathlib",
    "os",
)

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
        *_NETWORK_AND_FILES,
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


def _imports(source: str, package: tuple[str, ...]) -> set[str]:
    """Absolute names a module imports, with relative imports resolved against `package`.

    `from datacorn import infrastructure` also yields `datacorn.infrastructure`, so importing a
    forbidden submodule by name cannot slip past the rule.
    """
    names: set[str] = set()
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.Import):
            names.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            parts = list(package[: len(package) - node.level + 1]) if node.level else []
            if node.module:
                parts.extend(node.module.split("."))
            base = ".".join(parts)
            if base:
                names.add(base)
                names.update(f"{base}.{alias.name}" for alias in node.names)
    return names


def _violations(root: Path, layer: str) -> list[str]:
    found: list[str] = []
    for path in sorted((root / layer).rglob("*.py")):
        package = ("datacorn", *path.relative_to(root).parent.parts)
        for name in sorted(_imports(path.read_text(encoding="utf-8"), package)):
            if any(name == f or name.startswith(f + ".") for f in FORBIDDEN[layer]):
                found.append(f"{path.relative_to(root).as_posix()} imports {name}")
    return found


def _unfrozen_dataclasses(source: str) -> list[str]:
    """Classes decorated with `@dataclass` that do not pass a literal `frozen=True`."""
    found: list[str] = []
    for node in ast.walk(ast.parse(source)):
        if not isinstance(node, ast.ClassDef):
            continue
        for decorator in node.decorator_list:
            call = decorator if isinstance(decorator, ast.Call) else None
            target = call.func if call else decorator
            name = target.attr if isinstance(target, ast.Attribute) else getattr(target, "id", "")
            if name != "dataclass":
                continue
            frozen = call is not None and any(
                keyword.arg == "frozen"
                and isinstance(keyword.value, ast.Constant)
                and keyword.value.value is True
                for keyword in call.keywords
            )
            if not frozen:
                found.append(node.name)
    return found


@pytest.mark.parametrize("layer", sorted(FORBIDDEN))
def test_layer_does_not_import_outer_layers(layer: str) -> None:
    violations = _violations(SRC, layer)
    assert not violations, "\n".join(violations)


@pytest.mark.parametrize(
    ("layer", "relative_path", "statement", "flagged"),
    [
        ("domain", "bad.py", "import urllib.request", "urllib.request"),
        ("domain", "bad.py", "from pathlib import Path", "pathlib"),
        ("domain", "bad.py", "import httpx as client", "httpx"),
        ("domain", "bad.py", "from datacorn.infrastructure import http", "datacorn.infrastructure"),
        ("domain", "bad.py", "from datacorn import infrastructure", "datacorn.infrastructure"),
        ("domain", "bad.py", "from ..application import use_cases", "datacorn.application"),
        ("domain", "bad.py", "from .. import config", "datacorn.config"),
        ("application", "bad.py", "from datacorn import interfaces", "datacorn.interfaces"),
        (
            "application",
            "use_cases/bad.py",
            "from ...infrastructure import http",
            "datacorn.infrastructure",
        ),
    ],
)
def test_rule_catches_hidden_imports(
    tmp_path: Path, layer: str, relative_path: str, statement: str, flagged: str
) -> None:
    target = tmp_path / layer / relative_path
    target.parent.mkdir(parents=True)
    target.write_text(statement + "\n", encoding="utf-8")
    assert f"{layer}/{relative_path} imports {flagged}" in _violations(tmp_path, layer)


def test_rule_allows_pure_imports(tmp_path: Path) -> None:
    (tmp_path / "domain").mkdir()
    (tmp_path / "domain" / "ok.py").write_text(
        "import math\n"
        "from datetime import date\n"
        "from . import models\n"
        "from .errors import DomainError\n"
        "from datacorn.domain.models import FieldInputs\n",
        encoding="utf-8",
    )
    assert _violations(tmp_path, "domain") == []


@pytest.mark.parametrize("layer", ["domain", "application"])
def test_pure_layers_use_frozen_dataclasses(layer: str) -> None:
    violations = [
        f"{path.relative_to(SRC).as_posix()}: {name}"
        for path in sorted((SRC / layer).rglob("*.py"))
        for name in _unfrozen_dataclasses(path.read_text(encoding="utf-8"))
    ]
    assert not violations, "\n".join(violations)


@pytest.mark.parametrize(
    ("decorator", "expected"),
    [
        ("@dataclass", ["Box"]),
        ("@dataclass()", ["Box"]),
        ("@dataclass(slots=True)", ["Box"]),
        ("@dataclass(frozen=False)", ["Box"]),
        ("@dataclass(frozen=flag)", ["Box"]),
        ("@dataclasses.dataclass", ["Box"]),
        ("@dataclasses.dataclass(slots=True)", ["Box"]),
        ("@dataclass(frozen=True)", []),
        ("@dataclass(frozen=True, slots=True)", []),
        ("@dataclass(slots=True, frozen=True)", []),
        ("@dataclasses.dataclass(frozen=True)", []),
        ("@staticmethod", []),
    ],
)
def test_unfrozen_dataclass_is_detected(decorator: str, expected: list[str]) -> None:
    source = f"{decorator}\nclass Box:\n    x: int = 0\n"
    assert _unfrozen_dataclasses(source) == expected


def test_plain_classes_and_enums_are_not_dataclasses() -> None:
    source = "class Error(Exception): ...\nclass Mode(StrEnum):\n    A = 'a'\n"
    assert _unfrozen_dataclasses(source) == []
