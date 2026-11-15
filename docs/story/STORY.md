<!-- SI-assisted (Claude Code) draft of the team's story idea (docs/TEAM-ACTION-PLAN.es.md §7); reviewed by <name> -->
# Story: the orbital observer

**Status: draft for #59.** The narrator and the message come from the team plan (§7). The numbers below come from one real run of the API on the sample field (Hamilton County, Nebraska, rainfed corn, planted Apr 20, 105-day hybrid) on 2026-11-14. Re-run them before the demo, and replace them if the demo field changes.

One narrator. One message: **the tool supports the farmer, it does not replace them.**

## 1. The problem

It is April in Nebraska. A farmer has to plant corn in the next three weeks.

They cannot know what kind of summer is coming. A dry July at silking can cost half the crop. A wet spring can delay planting. The decisions are made now: when to plant, which hybrid, whether to plan for irrigation.

Most tools show today's weather or one average year. An average year never happens.

## 2. The observer

Someone has watched this field from orbit every day for 25 years.

It does not know what corn is. It sees colours: soil that darkens after rain and pales in drought, green that rises in June and fades in September. It sees that some summers look very different from the rest.

It sees patterns. It does not know what the farmer cares about. So it does not give orders. It shows what it saw, and it asks.

> The observer is a narrative device. It is not NASA, and no NASA logo, flag or mission patch appears anywhere in the story, the site or the deck.

## 3. What it saw (sample field, 25 seasons, 2001 to 2025)

- **Planting.** In most years the soil was ready between **Apr 17 and May 7**. A late frost after planting happened in about **1 year in 25**.
- **Water at silking.** In **13 of 25 seasons**, rainfed corn on this field would have run short of water around silking, the stage that matters most for yield.
- **The bad years were very bad.** In 2002 and 2012 the water balance gives about **half** of the field's potential yield.
- **El Niño.** NOAA's index says a strong El Niño is under way now (ONI +2.5, Aug to Oct 2026). In the El Niño years we have (2002, 2015, 2023), the water shortfall at silking was larger than in other years.

Every number is a range of past seasons replayed on this field: **a scenario, not a forecast.**

## 4. What we don't know

- **Only 3 El Niño years** are in the record. That is a hint, not a rule.
- Weather comes from NASA POWER (MERRA-2), a grid about 50 km wide. It does not see a storm that missed this one field.
- Soil comes from the USDA soil survey (SSURGO), not from a probe in this field.
- The yield numbers come from a water-balance model (FAO-56, FAO-33). They are not calibrated against this farm's yields.
- We don't know the farmer's priorities, budget or risk tolerance. Only they do.

Every card in the tool ends with something to check in the field, because the observer can't.

## 5. Impact

The farmer sees, in two minutes on a phone, how this field behaved across 25 real seasons, which risk matters most this year, and when to watch.

Then they decide, with their agronomist, using what they know and the observer doesn't.

**Next:** precomputed demo fields for instant loading, more regions (Peru, Brazil, Argentina) through region profiles, and calibration against county yields.

## Voice rules

- Short sentences. One idea each.
- Numbers come with a range or a count: "13 of 25 seasons", "Apr 17 to May 7".
- Say **"scenario, not forecast"**. Never "will", "predicts" or "guarantees".
- Say **"we don't know"** when we don't.
- The farmer decides. The tool shows. Never "you should".
- US units for the jury (inches, °F, acres).
- No NASA logos or insignia. Name NASA only as a data source ("NASA POWER", "NASA SMAP").

## Where the story is used

| Place | Uses |
|---|---|
| Demo (7 slides or 30 s, #61, #62) | 1 problem, 2 observer, 3 to 4 what it saw, 4 what we don't know, 5 impact |
| Story page (#60) | the same order, shorter |
| Project page text (#63) | sections 1, 3, 4 and 5, plus data credits |
| Comic deck (#62) | the six panels below |

## Comic version for the deck (#62)

Six panels for a comic-style deck, as the team proposed: simple panels, little text, real data. They follow the problem, who it affects, the solution, how it works and the impact. The farmer is Juan, the team's character. Captions are the words on the panel: one short sentence each, in English.

| Panel | Scene | Caption |
|---|---|---|
| 1 | Dawn over a corn field. Juan, a farmer in a cap, holds a seed bag and looks at a dry patch beside green rows. | Juan has to choose before he knows the summer. |
| 2 | Juan at the kitchen table, a calendar and three question marks: planting date, water, rotation. | When to plant? How much water? Which way to rotate? |
| 3 | A real screenshot: the 3D globe, then Juan's field outlined on the map. | He outlines his field. No login. |
| 4 | Simple arrows: NASA POWER weather and USDA soil flow into a soil-water model, then into 25 season stripes. | The tool replays 25 real seasons on his soil. |
| 5 | A real screenshot: the season stripes, the "Water at silking" card and the "Three ways to rotate" panel. Juan taps one option. | He compares the seasons and reads what we don't know. |
| 6 | Juan and a local agronomist at a truck, the printed PDF report between them. | Scenarios, not forecasts. Juan decides. |

- **Real numbers only.** "25 seasons" is what the app replays (2001 to 2025). Add no other number unless the app shows it.
- **Real screenshots.** Panels 3 and 5 are screenshots of the app, not drawings. If a shot comes from the sample report, keep its "Sample data" label visible.
- **Art.** Hand-drawn or Canva shapes. No NASA logo, flag or mission patch. If an image-generating SI tool makes any panel art, that panel carries a visible "SI-generated" watermark and the README section on SI use lists it (#66).
- **Voice.** The farmer decides and the tool shows. Never "will", "predicts" or "you should".
- **Slide count.** A deck may have at most 7 slides, title and intro included; one more and the project is not eligible for Global Judging. Use one title slide (team name, member names, the challenge) plus these six panels, and add no other slide.

## Source of the numbers

`POST /api/v1/fields/describe` and `/analyze` on the API at commit a82f147, sample field `SAMPLE_FIELD` from `apps/web/src/infrastructure/mapStyle.ts`, season 2027, irrigation `none`, previous crop corn. Fields used: `indicators[planting_window | flowering_water | frost]`, `runs[].relative_yield`, `enso.now` and `enso.outcomes`. Sources reported by the API: NASA POWER (MERRA-2), NOAA CPC ONI, USDA NASS CropScape CDL, USDA NRCS SSURGO.
