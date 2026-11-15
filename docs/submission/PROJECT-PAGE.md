<!-- SI-assisted (Claude Code); reviewed by <name> -->
# Project page text (the form fields)

Draft for [#63](https://github.com/RikepilB/Data_corn/issues/63), written Sun 2026-11-15 and refreshed the same day against `main` at `3b66e43`, which includes the rotation panel (PR [#80](https://github.com/RikepilB/Data_corn/pull/80)). One block per field of the submission form. Each code block is true of the app **today** (the live link, sample data): paste it as it is. A line starting with "Replace if" says what changes when something else lands. The form does not publish character limits; the counts are here so you can check them in the Edit form.

## Settle these first

1. **Name.** The app and its PDF call themselves "Data Corn"; the README says "Field Shift", which is the challenge's name. The blocks write `{NAME}`: replace it when [#54](https://github.com/RikepilB/Data_corn/issues/54) decides.
2. **Demo link.** Waits for [#61](https://github.com/RikepilB/Data_corn/issues/61) and [#62](https://github.com/RikepilB/Data_corn/issues/62).
3. **Real results.** The live link has no API behind it, so it shows a recorded sample field and says so. If real reports ship with the site ([#53](https://github.com/RikepilB/Data_corn/issues/53)), use the "Replace if" lines.
4. **Rotation panel.** PR [#80](https://github.com/RikepilB/Data_corn/pull/80) is merged and the text below describes it. Before pasting, open the live link and check that the three-strategy panel is there; if the link was not redeployed, say so to the team.
5. **SI.** Four sentences in the SI block are the team's to confirm; the list is under that block.

Left out on purpose: the rotation by dry/normal/wet matrix (cut; the compliance draft and issues #31 and #62 still describe it); the SMAP consistency check (not built, [#44](https://github.com/RikepilB/Data_corn/issues/44)); "GRACE shows the aquifer decline" (the NASA page cited below does not say it); the Sheridan-6 LEMA figures (unverified, [#26](https://github.com/RikepilB/Data_corn/issues/26)); the names of other tools (the comparison is in `docs/planning/PROBLEM.md`, section 7).

## Project Name

```
{NAME}: replay 25 real seasons on your own corn field
```

The tagline is a proposal; [#54](https://github.com/RikepilB/Data_corn/issues/54) decides.

## High-Level Project Summary  _(1040 characters)_

```
{NAME} helps a corn producer decide before the season is known. Start on a 3D globe with NASA climate layers, fly to your field and outline it on the map. The tool replays the real daily weather of the last 25 seasons (2001 to 2025) through a soil-water model, on the soil survey data for your field, and shows what each of those seasons would have meant for it: when to plant, where water runs short around silking, how hot flowering gets, how much irrigation it needs, and three rotations explained side by side (continuous corn, corn-soybean, corn-soybean with a rye cover crop), with the evidence, what we do not know and the risks to check locally for each. The result is one screen in plain English and US units that a farm manager and an agronomist can both read: a season film over the map, 25 season stripes with El Niño and La Niña years marked, and a card for each decision. Every number is a scenario built from past climate, not a forecast. The tool supports the producer's judgment and does not replace local agronomic advice.
```

## Link to Project Demo

Decided in [#61](https://github.com/RikepilB/Data_corn/issues/61). Paste the public link to the 7-slide deck or the 30-second video here, after opening it in a private window.

## Link to Final Project  _(340 characters)_

```
Live tool: https://field-shift-datacorn.vercel.app/ (provisional address). It runs on a recorded sample field in Nebraska, because no data server is deployed behind it, and the app labels it "Sample data". Source code, tests and data credits: https://github.com/RikepilB/Data_corn (Apache-2.0). Neither link needs a login or a registration.
```

Replace if #53 ships real reports: the second sentence becomes "It shows real results for N example fields, computed in advance from NASA POWER and USDA soil data."

## Detailed Project Description  _(3471 characters)_

```
What it does. A corn producer flies to a field on the globe, taps its corners, and checks a few details that come prefilled with typical values: season, planting date, hybrid maturity, irrigation, tillage and yield goal. In about ten seconds the tool shows how that field behaved across 25 past seasons. A season film plays the soil water day by day over the map. Season stripes show every year at a glance, with El Niño and La Niña years marked; tap a year to play its film. Cards cover the planting date, water and heat at silking, hybrid and frost, irrigation, waterlogging and the crops the field actually grew each year. A rotation panel under the verdict explains three strategies: continuous corn, corn-soybean, and corn-soybean with a cereal-rye cover. The one the crop map matches is marked and open. Each lists why it is suggested, the evidence, the benefits, what we do not know and the risks that someone local must review. The evidence comes mostly from Iowa studies, not from the High Plains, and the model does not carry water between crops. A PDF report downloads from the same screen.

How it works. For the field's location the engine reads daily weather from NASA POWER (2001 to today) and soil from the USDA soil survey (SSURGO). It computes reference evapotranspiration with the FAO-56 Penman-Monteith equation and runs a daily root-zone water balance. Relative yield follows the FAO-33 response to water by growth stage; crop development follows growing degree days. A scenario is the days already observed this season plus each past year for the rest of the season. NASA MODIS NDVI shows how the current season is going. The El Niño and La Niña phase of each past year comes from NOAA. Nothing needs a login, an account or an API key.

Why it helps. Planting, hybrid and irrigation choices are made before anyone knows what summer will bring, and an average year never happens. Twenty-five real seasons show the range. On the High Plains farmers irrigate from the Ogallala aquifer, which NASA Earth Observatory describes as under stress: about 30 percent of the water once stored beneath Kansas was gone by 2018, and about 40 percent more could go within 50 years if current trends continue. Knowing in advance how much water a field would need in a dry year helps plan that use.

What is new. Public tools we found each cover one piece of this decision: planting dates and frost, crop-stage forecasts, or soil-moisture monitoring. We did not find one that replays past seasons on a single field through a water balance and compares rotation options in one screen. We reviewed public information only, so a commercial product may do part of it.

Tools. Python 3.12 (FastAPI, NumPy, SciPy) in Clean Architecture for the engine; TypeScript, Astro, React and MapLibre GL JS for the web app; @react-pdf/renderer for the report. More than 60 engine tests and more than 30 web tests pass.

What we do not claim. Results are scenarios from historical climate, not forecasts. Weather comes from a grid about 50 km wide and soil from a survey, not from a probe in the field. The yield numbers come from published water-balance methods and are not calibrated against any farm's yields. We do not know the producer's priorities, budget or risk tolerance, so every card ends with something to check in the field. The public demo shows a recorded sample field (Nebraska) because no server is deployed behind it; the repository runs the full engine on real data.
```

Replace if #53 ships real reports: in "What we do not claim", drop the last sentence.

The "What is new" paragraph is the draft of [#29](https://github.com/RikepilB/Data_corn/issues/29); the team confirms the wording. Its basis is `docs/planning/PROBLEM.md`, section 7.

## Use of Super Intelligence (SI)  _(311 characters)_

```
Yes. We used Claude Code (Anthropic) as a coding and writing assistant. It scaffolded the repository, drafted planning documents and GitHub issues, helped research and cite sources, wrote and tested engine and web code under the team's direction, and helped write this page. docs/REFERENCES.md lists every tool.
```

The team confirms these before pasting ([#66](https://github.com/RikepilB/Data_corn/issues/66)); add each sentence only if it is true.

- The idea, the choice of problem and the story came from the team, not from SI.
- Each member adds any other SI tool they used, and what it did.
- SI-assisted files start with a header line naming the tool and the human reviewer. Today 20 of 171 code and document files carry it (counted 2026-11-15), so do not say "every file" yet.
- No image, video or audio in the project was generated by SI. If one is added, it carries a visible watermark.

## NASA Data  _(765 characters)_

```
NASA POWER, daily (parameters T2M_MAX, T2M_MIN, RH2M, WS2M, ALLSKY_SFC_SW_DWN, PRECTOTCORR, GWETROOT, GWETTOP; soil wetness from MERRA-2): the weather and root-zone wetness behind every result, 2001 to today. This is the central NASA data: without it the tool has no answer. NASA MODIS Vegetation Indices MOD13Q1 (250 m, 16-day NDVI), read through the ORNL DAAC MODIS web service: field NDVI for the season-progress card. NASA GIBS imagery: SMAP L4 root-zone soil moisture, GPM IMERG precipitation rate, MODIS Terra land surface temperature and NDVI, and Blue Marble, shown as layers on the globe (the model does not read them). Adapters for more NASA products (SMAP L4 SPL4SMGP, HLS, NASADEM, OpenET) are in the repository, switched off and not part of any result.
```

## Space Agency Partner Data and Other References  _(932 characters)_

```
ESA Copernicus Sentinel-2: the EOxCloudless mosaic for 2024 from EOX IT Services GmbH (contains modified Copernicus Sentinel data 2024; used under CC BY-NC-SA 4.0, non-commercial) is the satellite basemap when the globe is zoomed in. Other data: USDA NRCS SSURGO (Soil Data Access), USDA NASS CropScape (Cropland Data Layer), NOAA Climate Prediction Center ONI, ISRIC SoilGrids (outside the US), FCC Census Area API, OpenStreetMap Nominatim place search (data from OpenStreetMap contributors, ODbL). Methods: FAO Irrigation and Drainage Paper 56 (Allen et al. 1998) and 33 (Doorenbos and Kassam 1979); Saxton and Rawls (2006). Background: NASA Earth Observatory (2018), "Satellites Investigate Irrigation in a Stressed Aquifer". Libraries and fonts: Astro, React, MapLibre GL JS, @react-pdf/renderer, FastAPI, Pydantic, NumPy, SciPy, IBM Plex. Product IDs, versions and licences for every item: docs/REFERENCES.md in the repository.
```

EOX's licence page (read 2026-11-15) allows free non-commercial use under CC BY-NC-SA 4.0 and asks for this credit wherever the imagery is shown: "EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024)". Check the app's credit string against it ([#65](https://github.com/RikepilB/Data_corn/issues/65)).

## Images (optional)

JPG, PNG or GIF, 10 MB at most. Take four screenshots from the live link: the globe with a NASA layer, the outlined field, the results screen with the season stripes, and the season film. Keep the "Sample data" label visible. No NASA logos, and none of them SI-generated.

## Checked against

The code at `3b66e43` (adapters, `apps/web/src/ui/results/RotationPanel.tsx`, `apps/web/src/i18n/en.json`, `apps/api/src/datacorn/domain/report.py`); `python scripts/probe_sources.py modis` on 2026-11-15 (the ORNL DAAC MODIS service answered: 6 NDVI composites for the pilot point); `docs/REFERENCES.md` on this branch; the NASA Earth Observatory page and the EOX licence summary (`cloudless.eox.at/documentation/license`), both read in full on 2026-11-15. Not re-run today: the real API run behind the numbers in `docs/story/STORY.md` (2026-11-14).
