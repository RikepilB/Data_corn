<!-- SI-assisted (Claude Code); reviewed by <name> -->
# MVP: scope, success criteria, timeline and risks

Draft for Team DataCorn, written on Saturday 2026-11-14 (afternoon, PET). The team decides scope; this document records the cut lines and gates already in the [team action plan](../TEAM-ACTION-PLAN.es.md) (sections 5, 9 and 4) and the [implementation plan](../superpowers/plans/2026-11-14-field-shift-mvp.md), and ties them to the backlog. Index: [planning README](README.md).

All times are PET (UTC-5). Issue links go to the [Data_corn backlog](https://github.com/RikepilB/Data_corn/issues).

## 1. The MVP in one paragraph

For one corn field in one US state (recommended: western Kansas), compute a rotation by dry, normal and wet year matrix from NASA data, plus the corn planting window, and show it on a public, login-free Astro site in English and US units. The Must path ships on its own: every Should item can be cut without breaking it.

Working demo by **Sun 2026-11-15 20:00 PET**. Hard close **23:59 PET** (Mon 04:59 UTC).

## 2. What a judge or farmer sees, end to end

### 2.1 Walkthrough

| Step | Screen | What the visitor sees | Issues |
|---|---|---|---|
| 1 | Public address | The site opens with no login, no password field and no account. Planned address `field-shift-datacorn.web.app`. It is **not live yet**: it goes live with the first deploy. | [#52](https://github.com/RikepilB/Data_corn/issues/52), [#53](https://github.com/RikepilB/Data_corn/issues/53) |
| 2 | Story page `/` | The orbital observer: a visitor that has watched the same field every day since 1981 and knows nothing about farming, so it asks the producer what matters. Hero, how it works (calendar, twin, year types), what we don't know, a button to the tool, data credits. | [#59](https://github.com/RikepilB/Data_corn/issues/59), [#60](https://github.com/RikepilB/Data_corn/issues/60) |
| 3 | Tool page `/tool`: banners | A red "SYNTHETIC EXAMPLE" banner while the ficha is the example. The "scenarios, not forecasts" disclaimer, always visible. | [#49](https://github.com/RikepilB/Data_corn/issues/49) |
| 4 | Field | Field name and county, approximate location only. The map is a Should; the page works if it fails to load. | [#50](https://github.com/RikepilB/Data_corn/issues/50) |
| 5 | Planting strip | Leads with the all-years answer, for example (format taken from the synthetic example, not a result): "Typically ready to plant Apr 23 (Apr 17-Apr 29)", plus the usual last spring frost. Year-type rows sit underneath as context. How the dates are simulated (water balance and growing degree days, not a soil-temperature rule) is visible. | [#41](https://github.com/RikepilB/Data_corn/issues/41), [#49](https://github.com/RikepilB/Data_corn/issues/49) |
| 6 | Matrix | Rows are rotations, the current one first. Columns are Dry, Normal and Wet years. The synthetic example has 4 rotations and so 12 cells. | [#42](https://github.com/RikepilB/Data_corn/issues/42), [#49](https://github.com/RikepilB/Data_corn/issues/49) |
| 7 | Rotation cards | One card per rotation: why suggested, evidence with sources, benefits, information gaps, risks for local review. | [#39](https://github.com/RikepilB/Data_corn/issues/39), [#49](https://github.com/RikepilB/Data_corn/issues/49) |
| 8 | Priorities | Toggles for water use, forage, nitrogen fixing, erosion, organic matter and market re-order the rotations. The current rotation stays first. | [#48](https://github.com/RikepilB/Data_corn/issues/48), [#49](https://github.com/RikepilB/Data_corn/issues/49) |
| 9 | Notes | The consistency-check note (SMAP result, or "not available"), the calendar status (assumed or detected), and a small regional water-storage chart if GRACE is included. | [#44](https://github.com/RikepilB/Data_corn/issues/44), [#45](https://github.com/RikepilB/Data_corn/issues/45), [#47](https://github.com/RikepilB/Data_corn/issues/47) |

**Reading one matrix cell.** Each cell shows four numbers, each as a median with its p10 to p90 range, for example "30 (24-36) days" (format from the web helper tests):

- stress days if not irrigated;
- stress days at tasseling and silking (VT-R1);
- irrigation needed, in inches per acre;
- bare-soil days.

A confidence badge (high, medium or low) opens the reason on hover or tap. A missing value reads "no data", never 0. A rotation that is not irrigated reads "Not irrigated: would need X in/acre to avoid stress", muted, so it never looks like water used.

**Rotations compared (proposed; mentor review pending in [#27](https://github.com/RikepilB/Data_corn/issues/27)).**

1. Current: continuous corn, irrigated.
2. Corn, then soybean.
3. Corn, then cereal rye cover, then soybean.
4. Wheat, then corn, then sorghum, then fallow, dryland.

### 2.2 What a producer does in two minutes

1. Read the planting strip: when is it typically safe to plant, and how wide is the range.
2. Find the current rotation's row and compare each alternative across the dry, normal and wet columns. The dry column shows which rotation holds up when water is short.
3. Open a rotation card to see why it is suggested, the evidence, and what we don't know.
4. Set priorities and watch the order change.
5. Take the "risks for local review" to a local agronomist or extension contact.

This is the **product gate**: someone outside the team must be able to explain the matrix without help, within 2 minutes, on a phone ([#58](https://github.com/RikepilB/Data_corn/issues/58)).

### 2.3 What a judge also sees

- The demo: 7 slides in English (recommended) or a 30-second video, never both ([#61](https://github.com/RikepilB/Data_corn/issues/61), [#62](https://github.com/RikepilB/Data_corn/issues/62)). Slides: title and team; the problem in the observer's voice; what the tool does; how it works; NASA data used and partners; the matrix and what we don't know; impact and next steps.
- The project page text, with the one-sentence difference from existing tools ([#63](https://github.com/RikepilB/Data_corn/issues/63), [#29](https://github.com/RikepilB/Data_corn/issues/29)).
- This public repository: README, Apache-2.0 licence, [REFERENCES](../REFERENCES.md), [DATA-SOURCES](../DATA-SOURCES.md) and the SI disclosure ([#66](https://github.com/RikepilB/Data_corn/issues/66)).

## 3. Scope cut lines

Levels follow the team plan, section 5, and the issue labels.

### 3.1 Must (no cut)

| Item | Issues |
|---|---|
| One pilot field in Kansas (proposed: Sheridan County) and its current rotation read once from Crop Sequence Boundaries | [#19](https://github.com/RikepilB/Data_corn/issues/19), [#27](https://github.com/RikepilB/Data_corn/issues/27) |
| At least 3 rotations including the current one, each with why, evidence, benefits, gaps and risks | [#39](https://github.com/RikepilB/Data_corn/issues/39), [#24](https://github.com/RikepilB/Data_corn/issues/24) |
| NASA POWER climate and SSURGO soil into the FAO-56 twin: stress if not irrigated, stress at tasseling and silking, irrigation need, bare days | [#35](https://github.com/RikepilB/Data_corn/issues/35), [#36](https://github.com/RikepilB/Data_corn/issues/36), [#37](https://github.com/RikepilB/Data_corn/issues/37), [#38](https://github.com/RikepilB/Data_corn/issues/38), [#40](https://github.com/RikepilB/Data_corn/issues/40) |
| Year types (dry, normal, wet) and the matrix with ranges and confidence | [#41](https://github.com/RikepilB/Data_corn/issues/41), [#42](https://github.com/RikepilB/Data_corn/issues/42) |
| Corn planting window | [#41](https://github.com/RikepilB/Data_corn/issues/41) |
| `build_site_ficha` use case and CLI: the first real ficha | [#43](https://github.com/RikepilB/Data_corn/issues/43) |
| Public web, no login, English, US units: tool page, story page, end-to-end smoke test, deploy v0 and v1 | [#48](https://github.com/RikepilB/Data_corn/issues/48), [#49](https://github.com/RikepilB/Data_corn/issues/49), [#51](https://github.com/RikepilB/Data_corn/issues/51), [#52](https://github.com/RikepilB/Data_corn/issues/52), [#53](https://github.com/RikepilB/Data_corn/issues/53), [#60](https://github.com/RikepilB/Data_corn/issues/60) |
| Name, design tokens, wireframes, plain-English copy, usability test | [#54](https://github.com/RikepilB/Data_corn/issues/54), [#55](https://github.com/RikepilB/Data_corn/issues/55), [#56](https://github.com/RikepilB/Data_corn/issues/56), [#57](https://github.com/RikepilB/Data_corn/issues/57), [#58](https://github.com/RikepilB/Data_corn/issues/58) |
| Demo, story outline, project page text | [#59](https://github.com/RikepilB/Data_corn/issues/59), [#61](https://github.com/RikepilB/Data_corn/issues/61), [#62](https://github.com/RikepilB/Data_corn/issues/62), [#63](https://github.com/RikepilB/Data_corn/issues/63) |
| Sources and papers: data-source register, FAO-56 check, agronomy sources | [#16](https://github.com/RikepilB/Data_corn/issues/16), [#22](https://github.com/RikepilB/Data_corn/issues/22), [#23](https://github.com/RikepilB/Data_corn/issues/23), [#24](https://github.com/RikepilB/Data_corn/issues/24) |
| Validate: prior art, plausibility gate, rubric self-assessment | [#29](https://github.com/RikepilB/Data_corn/issues/29), [#30](https://github.com/RikepilB/Data_corn/issues/30), [#31](https://github.com/RikepilB/Data_corn/issues/31) |
| Engineering foundation: layering test, contract-first workflow | [#32](https://github.com/RikepilB/Data_corn/issues/32), [#33](https://github.com/RikepilB/Data_corn/issues/33) |
| Setup: scaffold pushed, collaborators, local environments, Firebase | [#11](https://github.com/RikepilB/Data_corn/issues/11), [#12](https://github.com/RikepilB/Data_corn/issues/12), [#13](https://github.com/RikepilB/Data_corn/issues/13), [#14](https://github.com/RikepilB/Data_corn/issues/14) |
| Submission: eligibility, compliance audit, SI disclosure, form, Submit for Judging | [#64](https://github.com/RikepilB/Data_corn/issues/64), [#65](https://github.com/RikepilB/Data_corn/issues/65), [#66](https://github.com/RikepilB/Data_corn/issues/66), [#67](https://github.com/RikepilB/Data_corn/issues/67), [#68](https://github.com/RikepilB/Data_corn/issues/68) |

### 3.2 Should (each falls back without breaking anything)

| Item | Issues | If cut |
|---|---|---|
| SMAP consistency check (current rotation only) | [#17](https://github.com/RikepilB/Data_corn/issues/17), [#18](https://github.com/RikepilB/Data_corn/issues/18), [#44](https://github.com/RikepilB/Data_corn/issues/44) | `validation.status` is `not-available`; cell confidence is capped at medium |
| NDVI crop calendar, bare windows, cover crops that fit without frost | [#45](https://github.com/RikepilB/Data_corn/issues/45) | `calendar.status` is `assumed`, from the site config |
| Relative erosion index (slope from SRTM) | [#46](https://github.com/RikepilB/Data_corn/issues/46) | `erosion_index` is omitted; the UI says "not computed" |
| GRACE regional water context | [#20](https://github.com/RikepilB/Data_corn/issues/20), [#47](https://github.com/RikepilB/Data_corn/issues/47) | Not shown |
| Field map | [#50](https://github.com/RikepilB/Data_corn/issues/50) | The page works without it |
| GitHub Actions: tests and build on every PR | [#34](https://github.com/RikepilB/Data_corn/issues/34) | Tests run locally |
| Method and context sources; mentor round 2 | [#25](https://github.com/RikepilB/Data_corn/issues/25), [#26](https://github.com/RikepilB/Data_corn/issues/26), [#28](https://github.com/RikepilB/Data_corn/issues/28) | Claims without a source are removed |

### 3.3 Could (out unless everything else is green)

- Planting-date scenarios (early, normal, late) that shift the VT-R1 window.
- OpenET field evapotranspiration, which needs an API key; the decision is due at Checkpoint 3 ([#21](https://github.com/RikepilB/Data_corn/issues/21)).
- A growing-degree-day estimate of the silking date.
- A second state (Iowa).
- Live analysis of any field (Cloud Run). The Google Cloud trial is not available on the owner's account, so this stays out.
- Optional offers and accounts ([#15](https://github.com/RikepilB/Data_corn/issues/15)).

## 4. Out of scope

Not built, and not claimed:

- **Forecasts.** No seasonal forecast, no yield prediction, no price or profit model. The `market` priority is a qualitative fit (better, similar, worse, unknown), not an economic result.
- **Replacing local advice.** No single "best" rotation, and no legal or water-right advice (allocations, permits).
- **In-season management.** No irrigation scheduling, fertiliser or nitrogen budgets, pest and disease advice, or hybrid choice.
- **Ground truth at field scale.** SMAP is a consistency check for the current rotation only; GRACE says nothing about one field or one well.
- **Accounts and stored data.** No login, no database, no saved fields, no personal data.
- **Arbitrary fields.** One precomputed field. Live analysis of any field is Could.
- **Unused sources.** ENSO indices (ONI, ICEN), SoilGrids and Meteomatics are not used after the pivot.
- **Other crops.** Only corn, soybean, winter wheat and sorghum, with cereal rye as a cover crop (FAO-56 winter-wheat values stand in for rye and the cards say so).
- **Promotion.** No commercial or vendor promotion, and no NASA logos or insignia.

## 5. Success criteria

### 5.1 Checkpoint gates

From the team plan, section 9.

| Gate | When | Question | Proof | Issues |
|---|---|---|---|---|
| Data | Sat 17:00 | Do we have the full record for the field? | NaN days in POWER; the SSURGO profile; years per year type; corn years per cell (5 or more, otherwise low confidence) | [#36](https://github.com/RikepilB/Data_corn/issues/36), [#38](https://github.com/RikepilB/Data_corn/issues/38), [#41](https://github.com/RikepilB/Data_corn/issues/41) |
| Science | Sat 21:00 | Is the twin credible? | FAO-56 Example 18 test green; annual crop ET against rain looks plausible; nothing is zero because of missing data; the irrigated baseline does not show 0 stress | [#30](https://github.com/RikepilB/Data_corn/issues/30), [#37](https://github.com/RikepilB/Data_corn/issues/37) |
| Validation | Sun 09:00 | What can we claim? | The SMAP status (`consistent`, `weak`, `inconsistent` or `not-available`) is written as it is in the ficha and on the page. It is never said to validate the alternatives. | [#44](https://github.com/RikepilB/Data_corn/issues/44), [#31](https://github.com/RikepilB/Data_corn/issues/31) |
| Product | Sun 14:00 | Does a producer understand it? | Someone outside the team explains the matrix in 2 minutes on a phone | [#58](https://github.com/RikepilB/Data_corn/issues/58) |
| Submission | Sun 17:30 | Does it meet the rules? | Section 6 of the [compliance checklist](../submission/SUBMISSION-COMPLIANCE.md); private window; no NASA logos; SI declared | [#65](https://github.com/RikepilB/Data_corn/issues/65) |
| Rubric | Sun 09:00 and 14:00 | How do we score? | 1 to 5 on Impact, Creativity, Validity, Relevance and Presentation; fix the lowest first | [#31](https://github.com/RikepilB/Data_corn/issues/31) |

**Proposed addition to the Data gate (to confirm with lane A):** report the NaN count of the solar-radiation column `rs_mj` for 1981-1983 as well. See risk 1 in section 7.

### 5.2 Epic-level definition of done

Quoted from the "Done when" of each epic.

| Epic | Done when |
|---|---|
| [#1](https://github.com/RikepilB/Data_corn/issues/1) | Every M0 task is closed. |
| [#2](https://github.com/RikepilB/Data_corn/issues/2) | Every Must and Should source has a dated probe result and a `docs/REFERENCES.md` row; AppEEARS data in hand, or a fallback chosen by Checkpoint 3. |
| [#3](https://github.com/RikepilB/Data_corn/issues/3) | `docs/PAPERS.md` and `docs/REFERENCES.md` are complete at the M4 freeze; claims marked unverified are verified or removed. |
| [#4](https://github.com/RikepilB/Data_corn/issues/4) | Mentor round 1 answered before the site config is final; plausibility gate passed before the first real ficha is shown; rubric scored twice. |
| [#5](https://github.com/RikepilB/Data_corn/issues/5) | `domain/` cannot import `adapters/` or `usecases/` (tested); every PR runs the tests. |
| [#6](https://github.com/RikepilB/Data_corn/issues/6) | Must tasks 1 to 9 merged and a real ficha generated for the pilot site by Checkpoint 2; Should tasks merged or falling back to `not-available` or `assumed`. |
| [#7](https://github.com/RikepilB/Data_corn/issues/7) | The public address serves the real ficha with no login, checked in a private window on a phone. |
| [#8](https://github.com/RikepilB/Data_corn/issues/8) | An outsider explains the matrix in 2 minutes on a phone (Sun 14:00 product gate). |
| [#9](https://github.com/RikepilB/Data_corn/issues/9) | Demo at a public link and project page text drafted by the M4 freeze. |
| [#10](https://github.com/RikepilB/Data_corn/issues/10) | Banner confirmation after Submit for Judging (target Sun 20:00 PET). |

## 6. Timeline

### 6.1 Milestones M0 to M5

The six milestones in the backlog are the team checkpoints. Task issues are listed under the milestone they belong to.

| Milestone | When (PET) | Exit criteria | Issues |
|---|---|---|---|
| M0 Setup | Sat 14:30 | Everyone has cloned the repo; `uv run pytest` and `pnpm build` pass; the AppEEARS request is submitted (recommended before 14:00) | [#11](https://github.com/RikepilB/Data_corn/issues/11) [#12](https://github.com/RikepilB/Data_corn/issues/12) [#13](https://github.com/RikepilB/Data_corn/issues/13) [#14](https://github.com/RikepilB/Data_corn/issues/14) [#17](https://github.com/RikepilB/Data_corn/issues/17) [#18](https://github.com/RikepilB/Data_corn/issues/18) [#19](https://github.com/RikepilB/Data_corn/issues/19) |
| M1 Checkpoint 1 | Sat 17:00 | POWER, ET0 and year types are ready; the web with the v0.2.0 example ficha is published on Firebase | [#16](https://github.com/RikepilB/Data_corn/issues/16) [#22](https://github.com/RikepilB/Data_corn/issues/22) [#23](https://github.com/RikepilB/Data_corn/issues/23) [#24](https://github.com/RikepilB/Data_corn/issues/24) [#27](https://github.com/RikepilB/Data_corn/issues/27) [#32](https://github.com/RikepilB/Data_corn/issues/32) [#33](https://github.com/RikepilB/Data_corn/issues/33) [#35](https://github.com/RikepilB/Data_corn/issues/35) [#36](https://github.com/RikepilB/Data_corn/issues/36) [#37](https://github.com/RikepilB/Data_corn/issues/37) [#41](https://github.com/RikepilB/Data_corn/issues/41) [#48](https://github.com/RikepilB/Data_corn/issues/48) [#49](https://github.com/RikepilB/Data_corn/issues/49) [#52](https://github.com/RikepilB/Data_corn/issues/52) [#54](https://github.com/RikepilB/Data_corn/issues/54) [#55](https://github.com/RikepilB/Data_corn/issues/55) [#56](https://github.com/RikepilB/Data_corn/issues/56) [#61](https://github.com/RikepilB/Data_corn/issues/61) |
| M2 Checkpoint 2 | Sat 21:00 | First **real** ficha of the pilot site with 3 or more rotations; then integration and deploy v1 (web v1 with real data online) | [#28](https://github.com/RikepilB/Data_corn/issues/28) [#29](https://github.com/RikepilB/Data_corn/issues/29) [#30](https://github.com/RikepilB/Data_corn/issues/30) [#34](https://github.com/RikepilB/Data_corn/issues/34) [#38](https://github.com/RikepilB/Data_corn/issues/38) [#39](https://github.com/RikepilB/Data_corn/issues/39) [#40](https://github.com/RikepilB/Data_corn/issues/40) [#42](https://github.com/RikepilB/Data_corn/issues/42) [#43](https://github.com/RikepilB/Data_corn/issues/43) [#51](https://github.com/RikepilB/Data_corn/issues/51) [#53](https://github.com/RikepilB/Data_corn/issues/53) [#57](https://github.com/RikepilB/Data_corn/issues/57) [#59](https://github.com/RikepilB/Data_corn/issues/59) [#64](https://github.com/RikepilB/Data_corn/issues/64) |
| M3 Checkpoint 3 | Sun 09:00 | Rubric self-assessment done; the team decides which Should items stay | [#15](https://github.com/RikepilB/Data_corn/issues/15) [#20](https://github.com/RikepilB/Data_corn/issues/20) [#21](https://github.com/RikepilB/Data_corn/issues/21) [#25](https://github.com/RikepilB/Data_corn/issues/25) [#26](https://github.com/RikepilB/Data_corn/issues/26) [#31](https://github.com/RikepilB/Data_corn/issues/31) [#44](https://github.com/RikepilB/Data_corn/issues/44) [#45](https://github.com/RikepilB/Data_corn/issues/45) [#46](https://github.com/RikepilB/Data_corn/issues/46) [#47](https://github.com/RikepilB/Data_corn/issues/47) [#50](https://github.com/RikepilB/Data_corn/issues/50) [#60](https://github.com/RikepilB/Data_corn/issues/60) |
| M4 Feature freeze | Sun 14:00 | Only fixes after this point; demo at a public link; project page text drafted; SI disclosure complete | [#58](https://github.com/RikepilB/Data_corn/issues/58) [#62](https://github.com/RikepilB/Data_corn/issues/62) [#63](https://github.com/RikepilB/Data_corn/issues/63) [#66](https://github.com/RikepilB/Data_corn/issues/66) |
| M5 Submit | Sun 20:00 | Compliance checklist fully ticked; form filled and saved; Submit for Judging; confirmation banner captured | [#65](https://github.com/RikepilB/Data_corn/issues/65) [#67](https://github.com/RikepilB/Data_corn/issues/67) [#68](https://github.com/RikepilB/Data_corn/issues/68) |

The ten epics ([#1](https://github.com/RikepilB/Data_corn/issues/1) to [#10](https://github.com/RikepilB/Data_corn/issues/10)) have no milestone; they close when their tasks do.

### 6.2 Day plan

From the team action plan, section 4.

| When (PET) | What | Done when |
|---|---|---|
| Sat 13:00-13:30 | Kickoff: six decisions, in order (pilot field, rotations, name and tagline, demo format, AppEEARS owner, repository) | The decisions are written down |
| Sat 13:30-14:30 | Accounts; public repo; AppEEARS request sent | Everyone has cloned; tests and build pass |
| Sat 14:30-17:00 | Lanes work in parallel | |
| **Sat 17:00** | Checkpoint 1 (15 min) | POWER, ET0 and year types ready; example ficha published on Firebase |
| Sat 17:00-21:00 | Twin and matrix; story script and brand v1 | |
| **Sat 21:00** | Checkpoint 2 (15 min) | First real ficha of the pilot site with 3 rotations |
| Sat 21:00-00:00 | Integration and deploy v1, then rest in shifts | Web v1 with real data online |
| **Sun 09:00** | Checkpoint 3 (15 min) and rubric self-assessment | The team decides which Should items enter |
| Sun 09:00-14:00 | SMAP, NDVI, erosion; UI polish; project page draft | |
| **Sun 14:00** | **Feature freeze** | Only fixes after this |
| Sun 14:00-16:30 | Demo, screenshots, references, SI disclosure | Demo at a public link |
| Sun 16:30-17:30 | Final review (the Sunday team meeting) | Compliance checklist, section 6 |
| Sun 17:30-19:30 | The team owner fills the form in English; tests in a private window | Save Progress and reload both work |
| **Sun 20:00** | **Submit for Judging** | Confirmation banner |
| Sun 20:00-23:59 | Reserve: resubmit only if something broke, never to add features | |

### 6.3 Critical path and open decisions

**Critical path:** first push of the scaffold ([#11](https://github.com/RikepilB/Data_corn/issues/11)); collaborators ([#12](https://github.com/RikepilB/Data_corn/issues/12)); Firebase login ([#14](https://github.com/RikepilB/Data_corn/issues/14)); Earthdata and the AppEEARS request ([#17](https://github.com/RikepilB/Data_corn/issues/17), [#18](https://github.com/RikepilB/Data_corn/issues/18)); pilot field and mentor round 1 ([#19](https://github.com/RikepilB/Data_corn/issues/19), [#27](https://github.com/RikepilB/Data_corn/issues/27)); Task 1 and Task 2 ([#35](https://github.com/RikepilB/Data_corn/issues/35), [#36](https://github.com/RikepilB/Data_corn/issues/36)); web helpers, then deploy v0 before Checkpoint 1 ([#48](https://github.com/RikepilB/Data_corn/issues/48), [#52](https://github.com/RikepilB/Data_corn/issues/52)); the name and the demo format ([#54](https://github.com/RikepilB/Data_corn/issues/54), [#61](https://github.com/RikepilB/Data_corn/issues/61)).

**Open decisions (recommendations only; the team decides):**

| Decision | Recommendation | Issue |
|---|---|---|
| Pilot state and field | Western Kansas, Sheridan County (GMD4) | [#19](https://github.com/RikepilB/Data_corn/issues/19), [#27](https://github.com/RikepilB/Data_corn/issues/27) |
| Rotations (at least 3, current included) | The four listed in section 2.1, reviewed by a mentor or agronomist | [#27](https://github.com/RikepilB/Data_corn/issues/27), [#39](https://github.com/RikepilB/Data_corn/issues/39) |
| Name and tagline | Three options on the table: Surco, Chacra 45, Field Shift | [#54](https://github.com/RikepilB/Data_corn/issues/54) |
| Demo format | 7 slides in English | [#61](https://github.com/RikepilB/Data_corn/issues/61) |
| Who submits the AppEEARS request | A lane C data person, before 14:00 | [#18](https://github.com/RikepilB/Data_corn/issues/18) |

## 7. Risks and fallbacks

| # | Risk | Mitigation or fallback | Issues |
|---|---|---|---|
| 1 | **POWER solar radiation may start in 1984, not 1981 (to verify).** A search summary of the POWER documentation says the meteorology starts on 1981-01-01 but the solar parameter (`ALLSKY_SFC_SW_DWN`) on 1984-01-01. If so, ET0 is missing for 1981-1983. The first crop year (1981) also starts on 1 September 1980, before the record begins. The plan drops a year from the matrix only when its April-September rain is too incomplete to classify (task 7). Task 6 carries soil-water state forward over days with missing inputs and records them in `nan_days`, but task 8 does not use that column. So an affected year could report zero or too-low stress and irrigation instead of a missing value, and slip into the bands (to check when tasks 6 and 8 are implemented). | Verify with the live run of Task 2 (NaN count of `rs_mj`). Options for lane A to choose from: use only the years where every input exists and report the real number of years; estimate radiation for the early years and label it `assumed`; exclude years with many missing days from the matrix and report how many. Do not state "45 years" or "15, 15, 15" as guaranteed until the count is known. | [#36](https://github.com/RikepilB/Data_corn/issues/36), [#40](https://github.com/RikepilB/Data_corn/issues/40), [#42](https://github.com/RikepilB/Data_corn/issues/42), [#16](https://github.com/RikepilB/Data_corn/issues/16) |
| 2 | The pivot arrives with about 30 hours left | Reuse the FAO-56 engine and the contract; the pivot changes the site, the climate split and two metrics, not the architecture | [#6](https://github.com/RikepilB/Data_corn/issues/6) |
| 3 | A judge remembers that the 2024 global winner built planting windows | Open with the rotation comparison and the Ogallala water story; the planting window is one column | [#29](https://github.com/RikepilB/Data_corn/issues/29) |
| 4 | The irrigated baseline shows 0 stress | Stress always comes from the rainfed run, for every rotation | [#40](https://github.com/RikepilB/Data_corn/issues/40) |
| 5 | Few corn years in a cell (corn-soybean has about half, the dryland rotation about a quarter) | Report `n_corn_years`; confidence is low below 5 corn years; the band is `null`, never 0 | [#42](https://github.com/RikepilB/Data_corn/issues/42) |
| 6 | The AppEEARS queue takes hours, or Earthdata is not set up | Submit early; the POWER-only twin runs without it; NDVI from the Planetary Computer STAC; SMAP becomes `not-available` | [#17](https://github.com/RikepilB/Data_corn/issues/17), [#18](https://github.com/RikepilB/Data_corn/issues/18) |
| 7 | Intermittent TLS resets on one development machine | Retry with backoff; cache every response in `data/raw/`; commit small fixtures; the demo never depends on a live call | [#36](https://github.com/RikepilB/Data_corn/issues/36) |
| 8 | Soil Data Access is slow or down | Cache the response; fall back to a typed texture class labelled `assumed` | [#38](https://github.com/RikepilB/Data_corn/issues/38) |
| 9 | Scope creep (any field, OpenET, growing-degree-day model) | The cut lines in section 3; one precomputed field first | [#31](https://github.com/RikepilB/Data_corn/issues/31) |
| 10 | A mentor disagrees on the state, the rotations, the year-type split or the thresholds | Open a decision issue; update the plan and the contract before Checkpoint 2 | [#27](https://github.com/RikepilB/Data_corn/issues/27), [#28](https://github.com/RikepilB/Data_corn/issues/28) |
| 11 | A member is not registered for the local event, or is waitlisted | Verify on day one; write to the Local Lead | [#64](https://github.com/RikepilB/Data_corn/issues/64) |
| 12 | The demo breaks the limit (more than 7 slides, or more than 30 seconds) and loses global eligibility | Decide the format early; count slides including the title | [#61](https://github.com/RikepilB/Data_corn/issues/61), [#62](https://github.com/RikepilB/Data_corn/issues/62) |
| 13 | A judge hits a login, a private link or a dead page | Private-window check on a phone outside the team network; GitHub Pages as the hosting fallback; set the team plan page link to public (see the README) | [#53](https://github.com/RikepilB/Data_corn/issues/53), [#65](https://github.com/RikepilB/Data_corn/issues/65), [#14](https://github.com/RikepilB/Data_corn/issues/14) |
| 14 | An unverified claim reaches the public page (the 2024 winner's link to a product, the weakness of ENSO in summer, the GRACE product name, the corn critical-window offset) | Keep the "to verify" marks until each is verified or removed | [#22](https://github.com/RikepilB/Data_corn/issues/22), [#24](https://github.com/RikepilB/Data_corn/issues/24) |
| 15 | The Must path has only one NASA data family (POWER). That meets the "at least one NASA dataset" rule, but SMAP, MODIS, SRTM and GRACE are what make NASA data feel central | The rubric self-assessment decides which Should items stay | [#31](https://github.com/RikepilB/Data_corn/issues/31) |
| 16 | SI disclosure is incomplete or inconsistent | One list of tools in the README and the form; headers on SI-assisted files; watermark on images and video | [#66](https://github.com/RikepilB/Data_corn/issues/66) |
