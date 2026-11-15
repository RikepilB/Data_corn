# SI-assisted (Claude Code); reviewed by <name>
"""Pre-submit audit: the checks of SUBMISSION-COMPLIANCE.md section 6 that a machine can do.

Read-only. It looks at the files git tracks, at the dependency lists, at the public links and,
when installed, runs gitleaks over the whole history. One line per check: PASS, FAIL, WARN or
INFO, and exit code 1 if any check FAILs. The checks that need a person are printed at the end,
so the audit run by someone outside the team (Sun 17:30 PET) starts from the same list.

Needs git. `gh` (repository visibility) and `gitleaks` are used when present.
Python 3.12, standard library only.

  python scripts/compliance_audit.py                 every check, links included
  python scripts/compliance_audit.py --offline       skip the checks that use the network
  python scripts/compliance_audit.py --url <link>    also test this link (the slides, for example)
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tomllib
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")
EMAIL_ALLOWED = ("noreply", "@example.", "@anthropic.com", "git@github.com")
URL = re.compile(r"https?://[^\s)>\]\"'`]+")
URL_HOST = re.compile(r"https?://([A-Za-z0-9][A-Za-z0-9.-]*)")
# Hosts that are not data, library or tile sources: the project's own links, namespaces, local servers.
NOT_A_SOURCE = (
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "example.com",
    "example.org",
    "www.w3.org",
    "json-schema.org",
    "github.com",
    "claude.com",
)
OWN_HOSTS = (".vercel.app", ".web.app", ".firebaseapp.com", ".run.app")
LOGIN = re.compile(
    r"type=[\"']password[\"']|signInWith|firebase/auth|getAuth\(|@clerk/|\bauth0\b|next-auth"
    r"|supabase\.auth|\"firebase\"\s*:",
    re.IGNORECASE,
)
PASSWORD_FIELD = re.compile(r"type=[\"']password[\"']", re.IGNORECASE)
API_AUTH = re.compile(r"OAuth2PasswordBearer|HTTPBearer|APIKeyHeader|HTTPBasic")
# Matched against the file name only ("nasa-logo.png", "meatball.svg", "mission-patch.png").
NASA_LOGO = re.compile(
    r"nasa[-_ .]?(logo|worm|meatball|insignia)|(logo|worm|meatball|insignia)[-_ .]?nasa|meatball"
    r"|mission[-_ .]?patch",
    re.IGNORECASE,
)
IMAGES = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".avif")
LOCKFILES = ("package-lock.json", "uv.lock", "pnpm-lock.yaml")
SOURCE_SUFFIXES = (".py", ".ts", ".tsx", ".astro", ".mjs", ".js", ".json", ".yaml", ".yml", ".css", ".html")
HEADER = "SI-assisted (Claude Code); reviewed by"

MANUAL = (
    "Every member is registered for Trujillo (My Local Event, Members tab)",
    "Someone outside the team opens the demo and the slides from a private window",
    "No face, voice or likeness of anyone under 18; any adult shown has agreed",
    "SI-generated images and video carry a visible watermark",
    "Music and images are licensed or royalty-free, with the source in REFERENCES.md",
    "Project page fields are in English, screenshots uploaded, Save Progress and reload",
    "Edit Lock ON, both checkboxes ticked, Submit for Judging before 20:00 PET, recheck the links",
)


@dataclass(frozen=True)
class Result:
    status: str  # PASS, FAIL, WARN or INFO
    check: str
    detail: str


# --- pure helpers (tested in apps/api/tests/unit/test_compliance_audit.py) ---------------------


def find_emails(text: str) -> list[str]:
    """Addresses in `text` that are not a no-reply, example or tool address."""
    found = {m for m in EMAIL.findall(text) if not any(ok in m.lower() for ok in EMAIL_ALLOWED)}
    return sorted(found)


def external_hosts(text: str) -> set[str]:
    """Hosts of the URLs in `text`, without the project's own links and the placeholders."""
    hosts = {h.rstrip(".").lower() for h in URL_HOST.findall(text)}
    return {h for h in hosts if h not in NOT_A_SOURCE and not h.endswith(OWN_HOSTS)}


def library_names(pyproject: dict, package_json: dict) -> list[str]:
    """Runtime libraries: the API's `dependencies` and the web's `dependencies`."""
    declared = pyproject.get("project", {}).get("dependencies", [])
    python = [re.split(r"[\[<>=!~;\s]", dep, maxsplit=1)[0] for dep in declared]
    return python + list(package_json.get("dependencies", {}))


def is_cited(name: str, references: str) -> bool:
    """Whether the text names the library as a whole word (`react` is not `react-dom`)."""
    text = references.lower()
    lowered = name.lower()
    for variant in {lowered, lowered.lstrip("@"), lowered.replace("-", " ")}:
        if re.search(r"(?<![\w@/.-])" + re.escape(variant) + r"(?![\w/-])", text):
            return True
    return False


def host_is_cited(host: str, references: str) -> bool:
    """Whether the text names the host, or its last three labels (`larc.nasa.gov`)."""
    text = references.lower()
    return host in text or ".".join(host.split(".")[-3:]) in text


def own_links(text: str) -> list[str]:
    """The project's deployed links named in `text` (Vercel, Firebase, Cloud Run)."""
    links = {u.rstrip(".,;") for u in URL.findall(text)}
    return sorted(u for u in links if (m := URL_HOST.match(u)) and m.group(1).lower().endswith(OWN_HOSTS))


# --- git, files and processes ---------------------------------------------------------------


def run(*cmd: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", check=False)


def tracked_files() -> list[Path]:
    names = run("git", "ls-files", "-z").stdout.split("\0")
    return [ROOT / name for name in names if name]


def read_text(path: Path) -> str | None:
    """The file's text, or None for a binary or very large file."""
    try:
        if path.stat().st_size > 1_000_000:
            return None
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def listing(items: list[str], limit: int = 6) -> str:
    shown = ", ".join(items[:limit])
    return shown + (f", and {len(items) - limit} more" if len(items) > limit else "")


# --- checks -----------------------------------------------------------------------------


def check_repo_public() -> list[Result]:
    name = "repository is public"
    if not shutil.which("gh"):
        return [Result("WARN", name, "gh is not installed: open the repository in a private window")]
    out = run("gh", "repo", "view", "--json", "visibility,url")
    if out.returncode:
        return [Result("WARN", name, f"gh could not read it: {out.stderr.strip()[:100]}")]
    data = json.loads(out.stdout)
    status = "PASS" if data["visibility"] == "PUBLIC" else "FAIL"
    return [Result(status, name, f"{data['url']} is {data['visibility']}")]


def check_docs(files: list[Path]) -> list[Result]:
    names = {rel(p) for p in files}
    missing = [n for n in ("README.md", "LICENSE", "docs/REFERENCES.md") if n not in names]
    licence = read_text(ROOT / "LICENSE") or ""
    apache = "Apache License" in licence and "Version 2.0" in licence
    return [
        Result(
            "FAIL" if missing else "PASS",
            "README, LICENSE, REFERENCES",
            f"missing: {missing}" if missing else "all three are tracked",
        ),
        Result(
            "PASS" if apache else "FAIL",
            "licence is Apache-2.0",
            "LICENSE has the Apache License 2.0 text" if apache else "LICENSE is not the Apache License 2.0",
        ),
    ]


def check_ignored(files: list[Path]) -> list[Result]:
    leaked = [
        rel(p)
        for p in files
        if rel(p).startswith(("references/", "data/raw/"))
        or (p.name.startswith(".env") and not p.name.endswith((".example", ".sample", ".template")))
    ]
    open_paths = [
        p for p in ("references/x", "data/raw/x", ".env") if run("git", "check-ignore", "-q", p).returncode
    ]
    problems = [f"tracked: {listing(leaked)}"] if leaked else []
    problems += [f"not in .gitignore: {', '.join(open_paths)}"] if open_paths else []
    detail = "; ".join(problems) or "references/, data/raw/ and .env are ignored and not tracked"
    return [Result("FAIL" if problems else "PASS", "pre-event research and secrets stay out", detail)]


def check_secrets() -> list[Result]:
    name = "no secrets in git history"
    exe = shutil.which("gitleaks")
    if not exe:
        return [Result("WARN", name, "gitleaks is not installed")]
    out = run(exe, "git", "--no-banner", "--no-color", "--redact", str(ROOT))
    if out.returncode == 0:
        return [Result("PASS", name, "gitleaks found no leaks in the history")]
    lines = [ln for ln in (out.stdout + out.stderr).splitlines() if "leaks" in ln or "ERR" in ln]
    return [Result("FAIL", name, listing(lines[-2:]) or f"gitleaks exited {out.returncode}")]


def check_nasa_logos(files: list[Path]) -> list[Result]:
    named = [rel(p) for p in files if NASA_LOGO.search(p.name)]
    images = [rel(p) for p in files if p.suffix.lower() in IMAGES]
    return [
        Result(
            "FAIL" if named else "PASS", "no file named like a NASA logo", listing(named) if named else "none"
        ),
        Result(
            "INFO",
            "images to look at by eye",
            f"{len(images)}: {listing(images, 10)}" if images else "none tracked",
        ),
    ]


def check_personal_data(files: list[Path]) -> list[Result]:
    found: dict[str, list[str]] = {}
    for path in files:
        text = None if path.name in LOCKFILES else read_text(path)
        if text and (emails := find_emails(text)):
            found[rel(path)] = emails
    if not found:
        return [
            Result(
                "PASS", "no e-mail addresses in tracked files", "none outside no-reply and example addresses"
            )
        ]
    where = [f"{p} ({len(e)}, {listing(sorted({a.split('@')[1] for a in e}), 3)})" for p, e in found.items()]
    return [Result("FAIL", "no e-mail addresses in tracked files", listing(where))]


def check_no_login(files: list[Path]) -> list[Result]:
    web, api = [], []
    for path in files:
        name = rel(path)
        text = read_text(path) or ""
        if name.startswith(("apps/web/src/", "apps/web/public/")) or name == "apps/web/package.json":
            web += [f"{name}: {m.group(0)}" for m in LOGIN.finditer(text)]
        elif name.startswith("apps/api/src/datacorn/interfaces/"):
            api += [f"{name}: {m.group(0)}" for m in API_AUTH.finditer(text)]
    return [
        Result(
            "FAIL" if web else "PASS",
            "the web needs no login",
            listing(web) if web else "no password field, sign-in call or auth dependency",
        ),
        Result(
            "WARN" if api else "PASS",
            "the API asks for no credentials",
            listing(api) if api else "no auth scheme on the routes",
        ),
    ]


def check_libraries(references: str) -> list[Result]:
    pyproject = tomllib.loads((ROOT / "apps/api/pyproject.toml").read_text(encoding="utf-8"))
    package = json.loads((ROOT / "apps/web/package.json").read_text(encoding="utf-8"))
    names = library_names(pyproject, package)
    missing = [n for n in names if not is_cited(n, references)]
    detail = (
        f"not in REFERENCES.md: {listing(missing, 12)}"
        if missing
        else f"all {len(names)} runtime libraries are named"
    )
    return [Result("FAIL" if missing else "PASS", "libraries are in REFERENCES.md", detail)]


def check_hosts(files: list[Path], references: str) -> list[Result]:
    hosts: dict[str, str] = {}
    for path in files:
        name = rel(path)
        in_code = name.startswith(
            ("apps/api/src/", "apps/web/src/", "apps/web/public/", "apps/web/astro.config")
        )
        if in_code and path.suffix in SOURCE_SUFFIXES and ".test." not in name:
            for host in external_hosts(read_text(path) or ""):
                hosts.setdefault(host, name)
    missing = sorted(h for h in hosts if not host_is_cited(h, references))
    where = listing([f"{h} ({hosts[h]})" for h in missing], 8)
    detail = f"{len(hosts)} hosts in the code; not named in REFERENCES.md: {where}"
    return [
        Result(
            "WARN" if missing else "PASS",
            "data, tile and font hosts are in REFERENCES.md",
            detail if missing else f"all {len(hosts)} hosts are named",
        )
    ]


def check_si_labels(files: list[Path]) -> list[Result]:
    code = [
        p
        for p in files
        if p.suffix in (".py", ".ts", ".tsx", ".astro", ".yml")
        and rel(p).startswith(("apps/", "scripts/", ".github/"))
    ]
    heads = {p: (read_text(p) or "")[:300] for p in code}
    labelled = [p for p, head in heads.items() if HEADER in head]
    unnamed = [p for p in labelled if "reviewed by <name>" in heads[p]]
    return [
        Result(
            "INFO",
            "SI labels in source files",
            f"{len(labelled)} of {len(code)} carry the header; {len(unnamed)} still say 'reviewed by <name>'",
        )
    ]


def fetch(url: str) -> tuple[int | None, str]:
    request = urllib.request.Request(url, headers={"User-Agent": "field-shift-compliance-audit"})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.status, response.read(200_000).decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        return error.code, ""
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        return None, str(error)


def check_links(urls: list[str]) -> list[Result]:
    results = []
    for url in urls:
        status, body = fetch(url)
        if status is None:
            results.append(Result("FAIL", f"opens: {url}", f"unreachable ({body[:80]})"))
        elif status in (401, 403):
            results.append(Result("FAIL", f"opens: {url}", f"HTTP {status}: asks for a login"))
        elif status >= 400:
            results.append(Result("FAIL", f"opens: {url}", f"HTTP {status}"))
        elif PASSWORD_FIELD.search(body):
            results.append(
                Result("FAIL", f"opens: {url}", f"HTTP {status} but the page has a password field")
            )
        else:
            results.append(Result("PASS", f"opens: {url}", f"HTTP {status}, no login"))
    return results


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Pre-submit compliance audit (read-only).")
    parser.add_argument("--offline", action="store_true", help="skip the checks that use the network")
    parser.add_argument("--url", action="append", default=[], help="another link to test (repeatable)")
    args = parser.parse_args(argv)
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    files = tracked_files()
    references = read_text(ROOT / "docs/REFERENCES.md") or ""
    results = check_docs(files) + check_ignored(files) + check_secrets()
    results += check_nasa_logos(files) + check_personal_data(files) + check_no_login(files)
    results += check_libraries(references) + check_hosts(files, references) + check_si_labels(files)
    if not args.offline:
        readme = read_text(ROOT / "README.md") or ""
        results += check_repo_public() + check_links(own_links(readme) + args.url)

    for r in results:
        print(f"{r.status:<5} {r.check:<46} {r.detail}")
    counts = {s: sum(r.status == s for r in results) for s in ("PASS", "FAIL", "WARN", "INFO")}
    print("\n" + ", ".join(f"{n} {s}" for s, n in counts.items()))
    print("\nStill manual (SUBMISSION-COMPLIANCE.md section 6):")
    for item in MANUAL:
        print(f"  [ ] {item}")
    return 1 if counts["FAIL"] else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
