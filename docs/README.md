<!-- SI-assisted (Claude Code); reviewed by <name> -->
# Documentation map

Every document in `docs/`, grouped by what it is for. Start with the [project README](../README.md) for the pitch, the status and the quickstart. This page says where everything else lives.

Two sets of documents describe the product from two sides. They were written separately and have not been merged into one (see [Two sets, not yet reconciled](#two-sets-not-yet-reconciled)).

## Start here

| If you are | Read, in this order |
|---|---|
| A judge or mentor (about 10 minutes) | [Project README](../README.md), then [PROBLEM](planning/PROBLEM.md) sections 1 to 3, 6 and 7, then [MVP](planning/MVP.md) section 2 |
| A teammate building a task | [Planning index](planning/README.md), the task in the [implementation plan](superpowers/plans/2026-11-14-field-shift-mvp.md), then the [app spec](#3-data-corn-app-spec-spanish) if the task touches the web or the API |
| Preparing the submission | [SUBMISSION-COMPLIANCE](submission/SUBMISSION-COMPLIANCE.md), then [MVP](planning/MVP.md) sections 5 and 6 |

## 1. Challenge and rules

The challenge text is a reference copy: do not edit it; correct it only by re-downloading from the source. The guides are links, not copies.

| File | Language | What it holds |
|---|---|---|
| [challenge/field-shift-challenge.md](challenge/field-shift-challenge.md) | English | The official text of the "Field Shift: Adapting Farms with NASA Data" challenge, downloaded 2026-11-14 |
| [challenge/space-apps-guides.md](challenge/space-apps-guides.md) | English | Links to the official project-submission, judging and FAQ guides, and where the 2026-11-14 full-text copy lives in git |
| [submission/SUBMISSION-COMPLIANCE.md](submission/SUBMISSION-COMPLIANCE.md) | English | The rules and dates we verified, and the pre-submit checklist |

## 2. Field Shift planning

The product, the science and the plan. Index, conventions, layout map and glossary: [planning/README.md](planning/README.md).

| File | Language | What it answers |
|---|---|---|
| [planning/PROBLEM.md](planning/PROBLEM.md) | English | Who the user is, the decision, why it is hard, what we do not claim, prior art |
| [planning/REQUIREMENTS.md](planning/REQUIREMENTS.md) | English | What the product must do, how we will know, which issue delivers it |
| [planning/MVP.md](planning/MVP.md) | English | What a judge sees end to end, Must/Should/Could cut lines, gates, timeline, risks |
| [planning/UI-UX-DESIGN.md](planning/UI-UX-DESIGN.md) | English | Audience, principles, page flow, states, design tokens, accessibility, voice |
| [architecture/ARCHITECTURE.md](architecture/ARCHITECTURE.md) | English | Stack evaluation, system design, science notes, pilot field, risks, decision log (D1 to D8) |
| [superpowers/plans/2026-11-14-field-shift-mvp.md](superpowers/plans/2026-11-14-field-shift-mvp.md) | English | The 15 test-driven tasks, with code-level detail |
| [TEAM-ACTION-PLAN.es.md](TEAM-ACTION-PLAN.es.md) | Spanish | Roles, schedule, mentor questions, brand and story notes |

## 3. Data Corn app spec (Spanish)

What the app skeleton in [`apps/`](../apps/README.md) is built to do: a globe, a lot drawn on the map, six cards, a season film, a PDF. The code cites these files by section number (`§5` in the flow file, `§B2` in the architecture file).

| File | What it holds |
|---|---|
| [app/arquitectura-y-api.md](app/arquitectura-y-api.md) | Part A: system view, clean-architecture layers, region profiles, folder structure, technical decisions. Part B: the API-to-web contract (routes, units, message keys, indicators, cards) |
| [app/flujo-y-pantalla.md](app/flujo-y-pantalla.md) | The user flow, what happens behind it, before/during/after the season, and the screen step by step with its PDF report |
| [app/requerimientos.md](app/requerimientos.md) | Functional (RF) and non-functional (RNF) requirements and the build order |

## 4. Data and citations

| File | Language | What it holds |
|---|---|---|
| [DATA-SOURCES.md](DATA-SOURCES.md) | English | Every data source and API: tier, status, probes, how they connect |
| [REFERENCES.md](REFERENCES.md) | English | Every cited source with its licence and status |
| [setup/ACCOUNTS.md](setup/ACCOUNTS.md) | English | Status of the Space Apps global offers and our accounts |

## 5. Research

| File | Language | What it holds |
|---|---|---|
| [research/ANTECEDENTES-maiz-EEUU.es.md](research/ANTECEDENTES-maiz-EEUU.es.md) | Spanish | Corn decision tools in the US, past Space Apps winners, why we pivoted |
| [research/MERCADO-GLOBAL-soluciones-similares.es.md](research/MERCADO-GLOBAL-soluciones-similares.es.md) | Spanish | The same scan across six regions: no identical public tool found, three partial twins |

## 6. Archive

Kept for history. Not current.

| File | Why it is here |
|---|---|
| [archive/solucion-tecnica.md](archive/solucion-tecnica.md) | The pre-pivot design for Andean sites with El Niño scenarios. Its FAO-56, SCS-CN and RUSLE notes may still be worth reading. |

## Two sets, not yet reconciled

The Field Shift planning set (section 2) and the app spec (section 3) agree on the layout: the Data Corn skeleton is the trunk (`apps/api/`, `apps/web/`), decision D8 in [ARCHITECTURE](architecture/ARCHITECTURE.md). They still disagree on these points:

| Topic | Planning set | App spec |
|---|---|---|
| What the page shows | Rotations by dry, normal and wet year (matrix), planting window | A globe, a drawn lot, six cards, a season film and 25 season stripes |
| Scenario axis | Dry, normal and wet year types (D7); El Niño / La Niña is not on the Must path | El Niño / La Niña phases |
| Demo location | One field in western Kansas | Example lots in Nebraska, Iowa, Illinois and Kansas |
| Where the numbers come from | Precomputed on static hosting first; a live API is a stretch | A live API on Cloud Run with Earth Engine |
| Requirement IDs | R, FR, NFR, SC, CR | RF, RNF |

Until the team settles these, the planning set's own source-of-truth order applies to the planning documents ([planning/README.md](planning/README.md) section 6, item 6). The app spec is not part of that order yet.
