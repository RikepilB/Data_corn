# SI-assisted (Claude Code); reviewed by <name>
"""Keep the README backlog in step with the GitHub issues.

GitHub does not sync Markdown checkboxes, so this script does it. It changes three things in
README.md and nothing else:

1. The outline lines `- [ ] [#N](url) <title> · <cut> · <milestone>` (tasks) and
   `- [ ] [#N](url) **<epic title>**` (epics). Everything on a line comes from GitHub:
   the box from the issue state (closed = [x]), the title, the cut line (Must, Should, Could)
   from the `must` / `should` / `could` label, and the milestone ("M2 · Checkpoint 2 ..." gives "M2").
   If an issue has no cut label or no milestone, that part stays as written.
2. The block between `<!-- outline:progress:start -->` and `<!-- outline:progress:end -->`:
   closed tasks per epic (an epic's tasks are the outline lines indented under it).
3. The block between `<!-- outline:next:start -->` and `<!-- outline:next:end -->`:
   closed tasks and the open Must tasks per milestone.

Needs the GitHub CLI (`gh`), signed in. Python 3.12, standard library only.

  python scripts/sync_readme_outline.py            dry run: show what would change
  python scripts/sync_readme_outline.py --apply    write README.md
  python scripts/sync_readme_outline.py --verify   exit 1 if README.md is out of date

Another README path can be given as the first argument: `... <path> --apply`.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

REPO = "RikepilB/Data_corn"
ISSUES_URL = f"https://github.com/{REPO}/issues"
SEP = " · "  # " · " between title, cut line and milestone
CUTS = ("must", "should", "could")
LINE = re.compile(
    r"^(?P<indent>\s*)- \[(?P<box>[ x])\] \[#(?P<num>\d+)\]"
    rf"\((?P<url>{re.escape(ISSUES_URL)}/\d+)\) (?P<rest>.*)$"
)
EPIC_PREFIX = re.compile(r"^EPIC \d+ · ")


def live() -> dict[int, dict]:
    p = subprocess.run(
        ["gh", "issue", "list", "--repo", REPO, "--state", "all", "--limit", "300",
         "--json", "number,title,state,labels,milestone"],
        capture_output=True, text=True, encoding="utf-8", check=True,
    )
    return {i["number"]: i for i in json.loads(p.stdout)}


def labels_of(issue: dict) -> set[str]:
    return {label["name"] for label in issue.get("labels", [])}


def cut_of(issue: dict) -> str | None:
    names = labels_of(issue)
    return next((c.capitalize() for c in CUTS if c in names), None)


def milestone_of(issue: dict) -> str | None:
    milestone = issue.get("milestone")
    return milestone["title"].split(" ")[0] if milestone else None


def is_epic(issue: dict) -> bool:
    return "epic" in labels_of(issue)


def link(n: int) -> str:
    return f"[#{n}]({ISSUES_URL}/{n})"


def desired(line: str, issues: dict[int, dict], seen: set[int]) -> str:
    m = LINE.match(line)
    if not m:
        return line
    n = int(m["num"])
    issue = issues.get(n)
    if issue is None:
        raise SystemExit(f"README mentions #{n} but GitHub has no such issue")
    seen.add(n)
    box = "x" if issue["state"] == "CLOSED" else " "
    rest = m["rest"]
    if rest.startswith("**") and rest.endswith("**"):
        new_rest = f"**{issue['title']}**"
    else:
        parts = rest.rsplit(SEP, 2)
        if len(parts) != 3:
            raise SystemExit(f"unexpected outline format for #{n}: {rest!r}")
        cut = cut_of(issue) or parts[1]
        milestone = milestone_of(issue) or parts[2]
        new_rest = f"{issue['title']}{SEP}{cut}{SEP}{milestone}"
    return f"{m['indent']}- [{box}] [#{n}]({m['url']}) {new_rest}"


def sync_lines(text: str, issues: dict[int, dict]) -> tuple[str, int, set[int], dict[int, list[int]]]:
    """Return the text with the outline lines fixed, how many lines changed, the issue numbers
    seen in the outline, and the tasks under each epic (read from the outline's indentation)."""
    seen: set[int] = set()
    members: dict[int, list[int]] = {}
    epic: int | None = None
    out, changed = [], 0
    for line in text.split("\n"):
        new = desired(line, issues, seen)
        changed += new != line
        out.append(new)
        m = LINE.match(new)
        if m:
            n = int(m["num"])
            if not m["indent"]:
                epic = n
                members[epic] = []
            elif epic is not None:
                members[epic].append(n)
    return "\n".join(out), changed, seen, members


def ratio(closed: int, total: int) -> str:
    return f"{closed} of {total}"


def progress_block(issues: dict[int, dict], members: dict[int, list[int]]) -> str:
    tasks = [i for i in issues.values() if not is_epic(i)]
    must = [i for i in tasks if cut_of(i) == "Must"]
    closed = lambda items: sum(i["state"] == "CLOSED" for i in items)  # noqa: E731
    rows = [
        f"**{ratio(closed(tasks), len(tasks))} tasks are closed.** "
        f"Must: {ratio(closed(must), len(must))}. Epics close when all their tasks do.",
        "",
        "| Epic | Closed | Still open |",
        "|---|---|---|",
    ]
    for epic_no, task_nos in members.items():
        epic = issues[epic_no]
        group = [issues[n] for n in task_nos]
        still = " ".join(link(i["number"]) for i in group if i["state"] != "CLOSED") or "none"
        name = EPIC_PREFIX.sub("EPIC " + str(epic_no) + " · ", epic["title"])
        rows.append(f"| [{name}]({ISSUES_URL}/{epic_no}) | {ratio(closed(group), len(group))} | {still} |")
    return "\n".join(rows)


def next_block(issues: dict[int, dict]) -> str:
    tasks = [i for i in issues.values() if not is_epic(i) and i.get("milestone")]
    titles = {}
    for i in tasks:
        titles.setdefault(milestone_of(i), i["milestone"]["title"])
    rows = [
        "| Milestone | Closed | Open Must tasks |",
        "|---|---|---|",
    ]
    for key in sorted(titles):
        group = [i for i in tasks if milestone_of(i) == key]
        done = sum(i["state"] == "CLOSED" for i in group)
        open_must = sorted(i["number"] for i in group if i["state"] != "CLOSED" and cut_of(i) == "Must")
        rows.append(f"| {titles[key]} | {ratio(done, len(group))} | {' '.join(link(n) for n in open_must) or 'none'} |")
    return "\n".join(rows)


def replace_block(text: str, name: str, content: str) -> str:
    start, end = f"<!-- outline:{name}:start -->", f"<!-- outline:{name}:end -->"
    pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.DOTALL)
    if not pattern.search(text):
        raise SystemExit(f"README has no '{start}' ... '{end}' block")
    return pattern.sub(lambda _: f"{start}\n{content}\n{end}", text, count=1)


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    mode = next((a for a in sys.argv[1:] if a.startswith("--")), "")
    path = Path(args[0]) if args else Path(__file__).resolve().parent.parent / "README.md"
    raw = path.read_bytes().decode("utf-8")
    crlf = "\r\n" in raw
    text = raw.replace("\r\n", "\n")

    issues = live()
    new_text, changed, seen, members = sync_lines(text, issues)
    new_text = replace_block(new_text, "progress", progress_block(issues, members))
    new_text = replace_block(new_text, "next", next_block(issues))

    missing = sorted(set(issues) - seen)
    closed = sum(i["state"] == "CLOSED" for i in issues.values())
    print(f"GitHub: {len(issues)} issues ({closed} closed); outline mentions {len(seen)}; "
          f"not in the outline: {missing or 'none'}")
    print(f"outline lines to change: {changed}; tables up to date: {new_text == text or changed == 0 and new_text == text}")

    if mode == "--verify":
        stale = new_text != text or bool(missing)
        print("README is out of date" if stale else "README is in step with GitHub")
        sys.exit(1 if stale else 0)
    if mode == "--apply":
        path.write_bytes((new_text.replace("\n", "\r\n") if crlf else new_text).encode("utf-8"))
        print(f"written: {path}")
    elif new_text != text:
        old_lines, new_lines = text.split("\n"), new_text.split("\n")
        shown = 0
        for old, new in zip(old_lines, new_lines):
            if old != new and shown < 30:
                print("- " + old[:160])
                print("+ " + new[:160])
                shown += 1
        if len(old_lines) != len(new_lines):
            print(f"(the tables change the file from {len(old_lines)} to {len(new_lines)} lines)")


if __name__ == "__main__":
    main()
