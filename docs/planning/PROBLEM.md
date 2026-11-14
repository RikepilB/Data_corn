<!-- SI-assisted (Claude Code); reviewed by <name> -->
# The problem

Who Field Shift is for, the decision it supports, why that decision is hard, what we do not claim, how it fits the challenge, and what already exists. Index: [planning README](README.md).

**How to read the citations.** Sources are named as they appear in [REFERENCES](../REFERENCES.md). Sources that appear only in the [prior-art research note](../research/ANTECEDENTES-maiz-EEUU.es.md) (Spanish) are marked "research note" and are to be added to REFERENCES ([#26](https://github.com/RikepilB/Data_corn/issues/26), [#22](https://github.com/RikepilB/Data_corn/issues/22)). Anything not yet checked against its source is marked **to verify**.

## 1. In short

A corn producer on the Ogallala aquifer has to choose a rotation and a planting date before knowing whether the season will be dry or wet, with little public, field-level information to compare the options. Field Shift replays decades of daily NASA POWER climate through a soil-water model for one field and shows how each candidate rotation would fare in dry, normal and wet years. It supports the producer's judgment. It does not forecast and it does not replace local agronomic advice.

## 2. Who the user is

**Large and medium irrigated corn producers in western Kansas.** The pivot after the mentor session narrowed the scope to corn and to large and medium producers in one US state. The proposed pilot is Sheridan County over the Ogallala aquifer. A mentor review of the state, the field and the rotations is still pending ([#27](https://github.com/RikepilB/Data_corn/issues/27)).

| | |
|---|---|
| What they have | Local knowledge, their own records, and an agronomist or extension contact. They tend to reject tools that skip over their own judgment (adoption literature in the research note, section 3). |
| What they lack | A way to ask "what if" for their own field: how would another rotation hold up in a dry year, using decades of climate rather than one season? |
| When they decide | Before and around planting. In April nobody knows whether the summer will be dry ([ARCHITECTURE](../architecture/ARCHITECTURE.md), R7). |
| How they read | On a phone, in US units, in English ([UI-UX-DESIGN](UI-UX-DESIGN.md)). |

The profile above is a working assumption from the team documents, not a survey. We have not interviewed a producer; confirming it with an extension contact is part of [#27](https://github.com/RikepilB/Data_corn/issues/27).

## 3. The decision

Three linked questions, asked about one field:

1. **Which rotation?** Compare the current rotation with at least two alternatives. The four proposed (to be reviewed by a mentor or agronomist): continuous corn with irrigation (current); corn then soybean; corn then cereal rye cover then soybean; dryland wheat then corn then sorghum then fallow.
2. **When to plant corn?** The planting window: soil warm enough and the last spring frost passed.
3. **At which growth stage does water run short?** For corn, the sensitive window is around tasseling and silking (VT-R1).

What "better" means depends on the producer's priorities: water use, forage, nitrogen fixing, erosion, organic matter, market. The tool lets the producer rank them and shows fit by level (better, similar, worse, unknown), not by score, to avoid false precision.

## 4. Why it is hard

- **The aquifer is declining.** The southern Ogallala is being depleted, and GRACE satellite data show it (research note, section 5.2, citing a NASA Earth Observatory article and Circle of Blue; to add to REFERENCES, [#26](https://github.com/RikepilB/Data_corn/issues/26)). Western Kansas has local evidence on cutting water use: the Sheridan-6 local enhanced management area (LEMA) used 23.1% less groundwater, with corn yield 218 against 220.6 bu/ac (about 1.2% lower). The data are self-reported by producers; a NASA Harvest study (Deines et al.) is said to estimate savings about 4.5 times the yield loss (research note, section 5.1; **to verify**). The model uses no LEMA number.
- **Dry and wet years differ, and averages hide the bad ones.** Field Shift therefore shows three columns (dry, normal, wet) built from terciles of April-September rainfall, instead of one average ([ARCHITECTURE](../architecture/ARCHITECTURE.md), section 4). Because the year type is unknown in April, the planting answer leads with all years and shows the year types as context only.
- **Corn is most sensitive at flowering.** Extension sources report yield loss per day of stress that is much larger at pollination and silking than before or after (Iowa State and UW, from Claassen and Shaw 1970 and Shaw 1988; research note, section 5.1: with 4 or more days of stress, up to 9% per day at pollination and silking, 1 to 5% per day before, up to 6% per day after). Those studies are 30 to 50 years old, so we show them only as cited ranges, never as a predicted loss. **To verify** in [#24](https://github.com/RikepilB/Data_corn/issues/24).
- **Evidence on rotations comes from elsewhere.** The figures in the research note come from Iowa and the wider Midwest (for example, continuous corn yielding 11 to 28% less than rotated corn in Iowa State trials), not from the Ogallala. Each rotation card must say what is local and what is borrowed, and what needs local review ([#24](https://github.com/RikepilB/Data_corn/issues/24)). **To verify.**
- **Little local, public information.** Existing tools each solve one piece (see section 7). The producer's own records are the best data, but decision tools fail when they demand tedious data entry (research note, section 3). Field Shift asks for nothing: the current rotation is read once from USDA Crop Sequence Boundaries and the soil from USDA SSURGO ([DATA-SOURCES](../DATA-SOURCES.md)).
- **The data are coarse.** POWER weather is on a grid of about half a degree, the SMAP soil-moisture pixel is 9 km and mixes irrigated center pivots with dryland, and GRACE is about 300 km wide. Nothing here is field-scale ground truth, and the tool says so ([ARCHITECTURE](../architecture/ARCHITECTURE.md), section 3).

## 5. What we do not claim

- **No forecasts.** Results are scenarios from historical climate. The "dry" column describes dry years in the record; it does not say next season will be dry.
- **No yield, profit or water-allocation predictions.** Per-day yield-loss figures appear only as cited ranges.
- **No replacement for local advice.** Every rotation lists risks that someone local must review, and information gaps.
- **No validation of the alternatives.** The SMAP comparison is a consistency check of the simulated moisture of the current rotation (rainfed run, monthly anomalies, 9 km pixel). It never validates the other rotations. GRACE is regional context only.
- **Generic crop parameters.** Crop coefficients, root depths and stage lengths come from FAO-56 tables until a local agronomist corrects them. Cereal rye has no FAO-56 row, so winter-wheat values stand in, and the card says so.
- **A proxy for soil temperature.** The planting window uses the NASA POWER `TSOIL1` value, a model top-layer temperature on a grid of about half a degree, not a 2-inch probe reading.
- **A relative erosion index, not tonnes per hectare.** (Should.)
- **One precomputed field.** The method could be applied to other counties; this submission does not demonstrate that.

The full list of claims rules, with acceptance criteria, is in [REQUIREMENTS](REQUIREMENTS.md) (group SC).

## 6. How it fits the challenge

The challenge is [Field Shift: Adapting Farms with NASA Data](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/). The requirements below are as summarised in [ARCHITECTURE](../architecture/ARCHITECTURE.md), section 1 (IDs R1 to R12, detailed in [REQUIREMENTS](REQUIREMENTS.md)).

| The brief asks for | Field Shift answers with | ID |
|---|---|---|
| At least three rotations, including the existing one | A rotation by year-type matrix with the current rotation first | R1 |
| Why suggested, evidence, benefits, information gaps, risks needing local review | One card per rotation | R2 |
| NASA Earth observations combined with local soil, crop characteristics and farmer priorities | POWER climate, SSURGO soil, FAO-56 crop parameters, priority toggles | R3 |
| Bare-field periods and seasons when crops are vulnerable | Bare-soil days; the crop calendar; stress at tasseling and silking | R4, R8 |
| Water metrics per rotation | Stress days if not irrigated; irrigation needed | R5 |
| How uncertainty is treated and where local expertise must validate | Ranges, number of years, confidence with a reason, risks for local review, "what we don't know" | R9 |
| Interpretable by farmers | Plain English, US units, a two-minute phone test | R10 |

How we aim to earn each judging criterion (from the [compliance checklist](../submission/SUBMISSION-COMPLIANCE.md), section 4):

| Criterion | Our case | Depends on |
|---|---|---|
| Impact | A rotation choice on a declining aquifer: which rotation holds up in a dry year and how much water it needs | Ogallala and LEMA sources ([#26](https://github.com/RikepilB/Data_corn/issues/26)) |
| Creativity | Year-type split instead of an average; planting window and flowering stress inside a rotation comparison, not a stand-alone planting app; the orbital-observer story | Differentiation statement ([#29](https://github.com/RikepilB/Data_corn/issues/29)) |
| Validity | FAO-56 water balance with stated limits; a plausibility gate; the SMAP consistency check if it is included | The SMAP check is a Should ([#44](https://github.com/RikepilB/Data_corn/issues/44)); without it Validity rests on the method, the gate ([#30](https://github.com/RikepilB/Data_corn/issues/30)) and the stated limits |
| Relevance | NASA POWER is core to the Must path; SMAP, MODIS, SRTM and GRACE strengthen it if included | Which Should items stay ([#31](https://github.com/RikepilB/Data_corn/issues/31)) |
| Presentation | One clear flow: field, planting window, matrix, cards; a producer story with equal weight | Demo and story ([#59](https://github.com/RikepilB/Data_corn/issues/59), [#62](https://github.com/RikepilB/Data_corn/issues/62)) |

## 7. Prior art and what we add

From the research note (about 25 public searches; only public information was reviewed, so a commercial product could do part of this without publishing it). Claims marked to verify are tracked in [#29](https://github.com/RikepilB/Data_corn/issues/29).

| Tool | What it does | What it lacks for this decision |
|---|---|---|
| [Corn GDD tool (MRCC Ag-Climate Tools, from the U2U project)](https://mrcc.purdue.edu/Ag-Climate-Tools) | Tests planting and maturity dates against historical climate; frost risk by county | No water, no soil, no rotations |
| [DAWN Dashboard](https://cropwatch.unl.edu/dawn-dashboard-decision-support-tool-corn-belt) | Crop-stage and growing-degree-day forecasts per field, up to 6 months | A seasonal forecast; does not compare rotations |
| [Iowa State FACTS](https://facts.extension.iastate.edu/home) | In-season soil water and nitrogen by layer, yield forecast | Iowa only, fixed sites |
| [Hybrid-Maize (UNL)](https://core.ac.uk/download/188065705.pdf) | Water-limited yield model; compares planting date and maturity | Desktop software for experts |
| [Crop-CASMA (USDA NASS)](https://www.nass.usda.gov/Research_and_Science/Cropland/metadata/metadata_cropcasma.htm) | SMAP soil-moisture and MODIS NDVI maps over cropland | Monitoring only; recommends nothing |
| [OpenET](https://pubs.usgs.gov/publication/70226741) | Field evapotranspiration at 30 m | Measures water used; does not plan rotations |
| [Cover Crop Decision Tool](https://ag.purdue.edu/news/2020/09/improved-tool-can-help-midwest-farmers-with-cover-crop-decisions.html) | Picks a cover crop and date by county | Cover crops only; no climate by year type |
| [NavePlant (Nave Analytics)](https://siliconprairienews.com/2025/02/nebraska-startup-wins-nasas-galactic-impact-award-in-the-2024-space-apps-challenge) | Planting windows, soil moisture and frost risk; beta with irrigated customers | Not a rotation comparison. Its origin in a 2024 Space Apps team (NVS-knot) is reported by the press: **to verify** |

The 2024 global Galactic Impact winner built planting-risk windows from SMAP and OpenET ([NASA announcement](https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-international-space-apps-challenge-announces-2024-global-winners/); research note, section 2). That is why the planting window is **one column** of the comparison, and the product is the rotation comparison the challenge asks for.

**The gap.** The research found no public tool that, for one field, compares three or four rotations (current included) on planting window, water shortage at flowering, irrigation demand and bare-soil days, with the evidence, gaps and risks of each, over historical dry, normal and wet years.

**What we add (draft; the team finalises the wording in [#29](https://github.com/RikepilB/Data_corn/issues/29)).** A public, zero-data-entry comparison of rotations for one field, built from decades of NASA POWER climate and split by dry, normal and wet years. The planting window and the flowering-stage stress are columns of that comparison. Uncertainty is shown as ranges and confidence levels, and each rotation carries its own evidence, gaps and risks.

**Lessons that shape the design** (research note, section 3): one decision, one user, one field; no data entry; uncertainty always visible; mark where the human decides; US units. They are carried into [UI-UX-DESIGN](UI-UX-DESIGN.md). Several broad agtech platforms were wound down or taken private between 2024 and 2026 (press reports, research note, section 1.3); the tools that last are simple, tied to one decision and hosted by a stable institution.

## 8. Open questions and claims to verify

| Item | Where it is tracked |
|---|---|
| State, field, rotations, year-type split and thresholds (mentor questions 1 to 4) | [#27](https://github.com/RikepilB/Data_corn/issues/27) |
| Validation, erosion, uncertainty display, judging (questions 5 to 10) and the local schedule | [#28](https://github.com/RikepilB/Data_corn/issues/28) |
| NVS-knot to NavePlant link; the 2024 "WaterWise" result (not used here); current state of the Planting Date Advisor | [#29](https://github.com/RikepilB/Data_corn/issues/29) |
| Weakness of the ENSO summer signal over the central US (why year types replace ENSO) | [#27](https://github.com/RikepilB/Data_corn/issues/27) |
| Ogallala and LEMA figures; add the sources to REFERENCES | [#26](https://github.com/RikepilB/Data_corn/issues/26) |
| Yield-loss ranges by stage and rotation benefits | [#24](https://github.com/RikepilB/Data_corn/issues/24) |
| Corn critical-window offset against the FAO-56 text | [#23](https://github.com/RikepilB/Data_corn/issues/23) |
