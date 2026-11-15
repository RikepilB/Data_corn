# SI-assisted (Claude Code); reviewed by <name>
"""The pure helpers of scripts/compliance_audit.py: the rules that decide PASS and FAIL."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[4] / "scripts" / "compliance_audit.py"
_spec = importlib.util.spec_from_file_location("compliance_audit", SCRIPT)
assert _spec is not None and _spec.loader is not None
audit = importlib.util.module_from_spec(_spec)
sys.modules["compliance_audit"] = audit  # dataclasses looks the module up by name
_spec.loader.exec_module(audit)


def test_find_emails_keeps_a_person_and_drops_tool_and_example_addresses() -> None:
    stranger = "someone" + "@mail.test"  # joined here so this file holds no address for the audit to flag
    text = f"ask {stranger}, not noreply@anthropic.com, git@github.com:a/b.git or me@example.org"
    assert audit.find_emails(text) == [stranger]


def test_find_emails_ignores_package_versions_and_scopes() -> None:
    assert audit.find_emails("react@18.3.1, pytest==9.2.0 and @astrojs/react") == []


def test_external_hosts_skip_own_links_and_placeholders() -> None:
    text = (
        "https://power.larc.nasa.gov/api https://field-shift.vercel.app/ http://localhost:4321/x "
        "https://github.com/a/b https://tile.googleapis.com/v1 https://www.w3.org/2000/svg"
    )
    assert audit.external_hosts(text) == {"power.larc.nasa.gov", "tile.googleapis.com"}


def test_library_names_strip_extras_and_pins_and_leave_out_dev_dependencies() -> None:
    pyproject = {"project": {"dependencies": ["uvicorn[standard]==0.54.0", "httpx==0.28.1", "scipy>=1.0"]}}
    package = {"dependencies": {"astro": "^7", "@astrojs/react": "^7"}, "devDependencies": {"vitest": "^5"}}
    assert audit.library_names(pyproject, package) == ["uvicorn", "httpx", "scipy", "astro", "@astrojs/react"]


@pytest.mark.parametrize(
    ("name", "text", "expected"),
    [
        ("react", "| React, react-dom | Web UI |", True),
        ("react-dom", "| React, react-dom | Web UI |", True),
        ("react", "| @astrojs/react | islands |", False),
        ("react", "| react-dom | Web UI |", False),
        ("pydantic", "| Pydantic, pydantic-settings | schemas |", True),
        ("pydantic", "| pydantic-settings | settings |", False),
        ("@astrojs/react", "| Astro, @astrojs/react | shell |", True),
        ("google-cloud-storage", "| Google Cloud Storage | cache |", True),
        ("httpx", "| requests | client |", False),
    ],
)
def test_is_cited_matches_whole_names_only(name: str, text: str, expected: bool) -> None:
    assert audit.is_cited(name, text) is expected


def test_host_is_cited_by_the_host_or_its_last_three_labels() -> None:
    references = "NASA POWER (`power.larc.nasa.gov`) and gibs.earthdata.nasa.gov"
    assert audit.host_is_cited("power.larc.nasa.gov", references)
    assert audit.host_is_cited("other.larc.nasa.gov", references)
    assert not audit.host_is_cited("modis.ornl.gov", references)


def test_own_links_picks_the_deployed_urls_out_of_markdown() -> None:
    text = "[demo](https://field-shift.vercel.app/?mock=1), https://field-shift.web.app/. See https://github.com/a/b"
    assert audit.own_links(text) == ["https://field-shift.vercel.app/?mock=1", "https://field-shift.web.app/"]


@pytest.mark.parametrize(
    "text",
    ['<input type="password">', "getAuth(app)", 'import { x } from "firebase/auth"', '"firebase": "^11.0.0"'],
)
def test_login_pattern_flags_auth_code(text: str) -> None:
    assert audit.LOGIN.search(text)


@pytest.mark.parametrize("text", ["getAuthor(book)", "the user may log in later", 'type="text"'])
def test_login_pattern_ignores_other_code(text: str) -> None:
    assert not audit.LOGIN.search(text)


@pytest.mark.parametrize(
    "name",
    [
        "nasa-logo.png",
        "NASA_meatball.svg",
        "logo-nasa.png",
        "nasalogo.png",
        "meatball.svg",
        "mission-patch.png",
    ],
)
def test_nasa_logo_pattern_flags_file_names(name: str) -> None:
    assert audit.NASA_LOGO.search(name)


@pytest.mark.parametrize("name", ["nasa-data-notes.md", "favicon.svg", "REFERENCES.md", "nasa-dispatch.md"])
def test_nasa_logo_pattern_ignores_other_names(name: str) -> None:
    assert not audit.NASA_LOGO.search(name)
