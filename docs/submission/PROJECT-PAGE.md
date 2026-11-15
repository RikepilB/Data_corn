<!-- SI-assisted (Claude Code); reviewed by <name> -->
# Project page text (the form fields)

Draft for [#63](https://github.com/RikepilB/Data_corn/issues/63), rewritten Sun 2026-11-15 against `main` at `551281f`, the build that is live. It includes the rotation sources ([#88](https://github.com/RikepilB/Data_corn/pull/88)), the About panel ([#90](https://github.com/RikepilB/Data_corn/pull/90)), the reports computed in advance ([#98](https://github.com/RikepilB/Data_corn/pull/98)), the fix that lets the example show them ([#102](https://github.com/RikepilB/Data_corn/pull/102)) and the design and accessibility pass ([#103](https://github.com/RikepilB/Data_corn/pull/103)). There is one block per form field, in the form's order. Paste each code block as it is. The guides publish no character limits; the counts are here to check against the Edit form.

## Settle these first

1. **Name.** The app and its PDF say "Data Corn"; the challenge is "Field Shift". The blocks write `{NAME}` until [#54](https://github.com/RikepilB/Data_corn/issues/54) decides.
2. **Demo link.** Waits for [#61](https://github.com/RikepilB/Data_corn/issues/61) and [#62](https://github.com/RikepilB/Data_corn/issues/62). The comic panels for the deck are in `docs/story/STORY.md`.
3. **Live link.** Production was redeployed from `551281f` on 2026-11-15. The bare link redirects to `?mock=1`; "See an example", then "See results", shows the real report under the banner "Real data, precomputed 2026-11-15. Not live." That redirect is a Vercel setting, not in the repository, so keep it on any redeploy. Before pasting, open the bare link once in a private window on a phone outside the team network: the last check in [#53](https://github.com/RikepilB/Data_corn/issues/53).
4. **SI.** The team confirms the sentences listed under the SI block.

Left out on purpose: forecasts of any kind (the tool replays past seasons); the dry/normal/wet matrix (cut: seasons are grouped by El Niño and La Niña); erosion numbers (the erosion index is not wired into the app, [#94](https://github.com/RikepilB/Data_corn/issues/94)); "GRACE shows the aquifer decline" (the NASA page cited below does not say it); the Sheridan-6 LEMA figures (unverified, [#26](https://github.com/RikepilB/Data_corn/issues/26)); anything about Peru (the tool is for US corn).

## Project Name

```
{NAME}: replay 25 real seasons on your own corn field
```

The tagline is a proposal; [#54](https://github.com/RikepilB/Data_corn/issues/54) decides.

## High-Level Project Summary  _(1055 characters)_

```
{NAME} helps a US corn producer decide before the season is known. Start on a 3D globe with NASA climate layers, fly to your field and outline it on the map. The tool replays the real daily weather of the seasons from 2001 to 2025, from NASA POWER, through a soil-water model on the USDA soil survey for that field. It shows what each season would have meant: when to plant, where water ran short and how hot it got around silking, and how much irrigation the field needed. It also puts three rotation strategies side by side: corn after corn; corn and soybean, taking turns; and corn and soybean, with a rye cover crop. Each strategy lists its evidence, what we do not know and the risks to check locally. One screen in plain English and US units serves a farm manager and an agronomist: a season film over the map, season stripes with El Niño and La Niña years marked, and a card for each decision. Every number is a scenario built from past climate, not a forecast. The tool supports the producer's judgment and does not replace local agronomic advice.
```

## Link to Project Demo

Decided in [#61](https://github.com/RikepilB/Data_corn/issues/61). Paste the public link to the 7-slide deck or the 30-second video, after opening it in a private window.

## Link to Final Project  _(557 characters)_

```
Live tool: https://field-shift-datacorn.vercel.app/ (provisional address). It runs without a data server. "See an example" opens a rainfed corn field in Hamilton County, Nebraska, with a real engine report computed in advance, under the banner "Real data, precomputed 2026-11-15. Not live." Any other field, or a changed form value such as irrigation, shows invented sample numbers under the banner "Sample data (no API)". Source code, tests and data credits: https://github.com/RikepilB/Data_corn (Apache-2.0). Neither link needs a login or a registration.
```

Replace if the per-irrigation reports merge ([#100](https://github.com/RikepilB/Data_corn/issues/100)), and only once the lead confirms it: remove " such as irrigation" and, after "Not live.", add "Changing the irrigation option keeps a real report."

## Project Details (the Detailed Project Description field)  _(5410 characters for the six answers)_

The Edit form asks six questions in this field (screenshot Richard shared on 2026-11-15). The public guide lists five prompts for the same field, and the six answers cover them. If the form shows one box, paste the six questions and answers in order. If it shows six boxes, paste each answer into its own box.

### What does your project do, and how does it work?  _(1289 characters)_

```
{NAME} shows a US corn producer how one field would have behaved in each of 25 past seasons, 2001 to 2025. You fly over a 3D globe with NASA climate layers, outline your field on the map and check a few prefilled details: season, planting date, hybrid maturity, irrigation and tillage. For that spot, the engine reads daily weather from NASA POWER and soil from the USDA soil survey (SSURGO). It computes reference evapotranspiration with the FAO-56 Penman-Monteith equation and runs a daily root-zone water balance. Crop stages follow growing degree days, and relative yield follows the FAO-33 seasonal response of maize to water. Each scenario is this season's observed days, if any, followed by one past season for the rest. One screen then shows a season film of the field's soil water over the map, and season stripes with El Niño and La Niña years marked from NOAA's index. The cards cover planting date, field progress (NASA MODIS NDVI), water and heat at silking, hybrid and frost, irrigation, waterlogging and rotation (the crop grown each year, from the USDA Cropland Data Layer). A panel, "Three ways to rotate", explains three strategies: corn after corn; corn and soybean, taking turns; and corn and soybean, with a rye cover crop. A PDF report downloads from the same screen.
```

### What benefits does it have?  _(644 characters)_

```
A producer sees the range of real seasons on their own field, instead of one average year that never happens. The screen is in plain English and US units, so a farm manager and an agronomist can read it together, and the cards say what to check in the field. A Display menu offers larger text, high contrast for sunlight and a calm mode without autoplay. The risk colours are safe for colour-blind readers, and a word and an icon always carry the meaning. Each rotation strategy lists why it is shown, its evidence and source, the benefits, what we do not know and the risks to check locally. It runs in a browser, with no login and no account.
```

### What is the intended impact of the project?  _(620 characters)_

```
We want producers to weigh planting, hybrid, irrigation and rotation choices before the season, with the range of past outcomes in view. On the High Plains, irrigation draws on the Ogallala aquifer, which NASA Earth Observatory describes as under stress. It reports that about 30 percent of the water once stored beneath Kansas was gone by 2018, and that about 40 percent more could go within 50 years if trends continue. Knowing in advance how much water a field would have needed in dry seasons helps plan that use. The tool supports the producer's judgment and the local agronomist's advice. It does not replace them.
```

### What tools, coding languages, hardware, or software did you use?  _(666 characters)_

```
Python 3.12 with FastAPI, Pydantic, NumPy and SciPy for the engine, in layers (Clean Architecture) that keep the science apart from the data sources. TypeScript with Astro, React and MapLibre GL JS for the web app, and @react-pdf/renderer for the PDF report. GitHub Actions runs the checks on every pull request: ruff and more than 170 engine tests (pytest), then the web build, the type check and more than 40 unit tests (Vitest). Playwright smoke tests are run by hand. No special hardware. Claude Code and Codex helped write code, tests and documents (see the SI answer). Every data source and method, with its licence, is in docs/REFERENCES.md in the repository.
```

### How is your project creative?  _(1002 characters)_

```
It turns 25 years of daily weather into a film of one field's season, with season stripes you can tap to replay any year. It puts rotation strategies side by side with what we do not know about each, not only their benefits. Decision tools for US corn already exist. DAWN, described in the Bulletin of the American Meteorological Society (2024), turns seasonal forecasts and crop models into planting, irrigation and fertilizer comparisons for Corn Belt farmers, with user accounts and a network of extension partners. Agroptimizer recommends corn and soybean management, and a 2024 study compared it with local experts in Wisconsin. Ours takes another route. It replays observed past seasons through a water balance on the soil of one drawn field, needs no login, and states what it does not know next to each rotation strategy. It gives scenarios from past climate, not forecasts, and it has no nutrient or profit model. We reviewed public information only, so another product may cover part of this.
```

The prior-art sentences are the draft for [#29](https://github.com/RikepilB/Data_corn/issues/29); both sources have rows in `docs/REFERENCES.md`. DAWN was read in full; for Agroptimizer only the abstract and the university's summary were read.

### What factors did your team consider?  _(1189 characters)_

```
Results are scenarios built from past climate, not forecasts. Weather comes from a grid about 50 km wide and soil from a survey, not from a probe in the field. Yield numbers come from published water-balance methods and are not calibrated against any farm's yields. Crop parameters are generic, and the degree days to maturity for each hybrid are not checked against a source yet. The rotation evidence comes mostly from Iowa studies, not from the High Plains. The model does not carry water between crops or model the water a rye cover uses. A card with no data says "No data" instead of showing a number. Where the soil survey has no soil or slope for a spot, the engine still uses generic values and does not flag them yet. We do not know a producer's priorities, budget or risk tolerance, and the tool has not been tested with farmers or extension specialists yet. The app needs no login and asks for no personal data, and NASA appears only as a data source. No data server is deployed behind the public demo, so it shows a real report, computed in advance, for one rainfed example field in Nebraska, and invented sample numbers, labelled as such, for any other field or changed value.
```

## Use of Super Intelligence (SI)  _(1168 characters)_

```
Yes. The idea, the choice of challenge and the story idea came from the team. We used Claude Code (Anthropic) as a coding, writing and research assistant. It helped scaffold the repository, write and test engine and web code under the team's direction, draft planning documents, GitHub issues, the story and the comic captions from the team's outline, find and summarize sources, and write this page. One team member used Codex (OpenAI) to write a soil-erosion index function that the app does not use yet. Every number in a real report is computed by the engine from public data, with the methods cited in docs/REFERENCES.md; no SI model writes or estimates those values. The invented sample numbers the demo shows for other fields or changed values come from code written with SI help, and the app labels them "Sample data". The README has a section on SI use, and the package metadata says the code was written with SI assistance. The only image in the app is the favicon, a small SVG written as code with SI assistance. Any SI-generated image, video or audio in the demo or the slides carries a visible watermark. No NASA logos, flags or mission insignia are used.
```

Judges do not read this answer, but the form requires it ([#66](https://github.com/RikepilB/Data_corn/issues/66)). The team confirms these before pasting, and keeps a sentence only if it is true:

- The idea, the choice of challenge and the story idea came from the team, not from SI.
- Each member adds any other SI tool they used, and what it did.
- Apart from the favicon (SVG code written with SI help), no image, video or audio was generated by SI, including the comic and any Canva art.

## NASA Data  _(672 characters)_

```
NASA POWER, daily (T2M_MAX, T2M_MIN, RH2M, WS2M, ALLSKY_SFC_SW_DWN, PRECTOTCORR): the weather behind every result, 2001 to today. It is the central NASA data: without it the tool has no answer. NASA MODIS Vegetation Indices MOD13Q1 (250 m, 16-day NDVI), read through the ORNL DAAC MODIS web service: the field's NDVI for the field-progress card. NASA GIBS imagery: SMAP L4 root-zone soil moisture, GPM IMERG precipitation rate, MODIS Terra land surface temperature and NDVI, and Blue Marble, shown as layers on the globe (the model does not read them). Adapters for more NASA products (SMAP L4, HLS, NASADEM) are in the repository, switched off and not part of any result.
```

## Space Agency Partner Data and Other References  _(1337 characters)_

```
ESA Copernicus Sentinel-2: EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024), the satellite basemap when the globe is zoomed in, used under CC BY-NC-SA 4.0 (non-commercial). Other data: USDA NRCS SSURGO (Soil Data Access), USDA NASS Cropland Data Layer (CropScape), NOAA Climate Prediction Center Oceanic Niño Index, ISRIC SoilGrids (soil fallback), FCC Census Area API, OpenStreetMap Nominatim place search (data from OpenStreetMap contributors, ODbL). Methods: FAO Irrigation and Drainage Papers 56 (Allen et al. 1998) and 33 (Doorenbos and Kassam 1979); Saxton and Rawls (2006) when the soil survey gives no available water; growing degree days by the 86/50 method (Pope 2008, Iowa State University Extension). Rotation evidence: Iowa State University Extension. Background and prior art: NASA Earth Observatory (2018), "Satellites Investigate Irrigation in a Stressed Aquifer"; Liang et al. (2024), DAWN, Bulletin of the American Meteorological Society; Mourtzinis and Conley (2024), Agroptimizer, Crop, Forage & Turfgrass Management. Libraries and fonts: Astro, React, MapLibre GL JS, @react-pdf/renderer, FastAPI, Pydantic, NumPy, SciPy, Atkinson Hyperlegible Next, IBM Plex Mono. Product IDs, versions and licences for every item: docs/REFERENCES.md in the repository.
```

The EOX credit above is the one EOX's licence page asks for (read 2026-11-15). Since [#103](https://github.com/RikepilB/Data_corn/pull/103) the app shows the same words on the map, in the About panel and in the PDF.

## Images (optional)

JPG, PNG or GIF, 10 MB at most. Take four screenshots from the live link: the globe with a NASA layer, the outlined field, the results with the season stripes and the "Real data" banner, and the "Three ways to rotate" panel. No NASA logos, and none SI-generated.

## Checked against

`main` at `551281f`, redeployed to the live link on 2026-11-15. On that day the bare link redirected (307) to `?mock=1`, served `data/reports/hamilton-ne.json` (57 KB), and its bundle carried the "Real data" banner, the EOxCloudless credit and the Display menu. A fact-check on 2026-11-15 read the engine (`et0.py`, `water_balance.py`, `scenarios.py`, `phenology.py`, `soil.py`, `risks.py`), the web copy (`apps/web/src/i18n/en.json`), the reports computed in advance and the 2026 guides. This version applies its corrections: yield loss uses the FAO-33 seasonal Ky, not a product by growth stage; the yield goal and previous-crop inputs change no result; only the Nebraska example is reachable from the app; the live link redirects (307) to `?mock=1`. Test counts come from the merge checks of #88, #90, #98 and #102: 179 engine tests and 51 web unit tests. Not re-run today: the API run behind the numbers in `docs/story/STORY.md` (2026-11-14).
