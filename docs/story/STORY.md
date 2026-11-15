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

## Source of the numbers

`POST /api/v1/fields/describe` and `/analyze` on the API at commit a82f147, sample field `SAMPLE_FIELD` from `apps/web/src/infrastructure/mapStyle.ts`, season 2027, irrigation `none`, previous crop corn. Fields used: `indicators[planting_window | flowering_water | frost]`, `runs[].relative_yield`, `enso.now` and `enso.outcomes`. Sources reported by the API: NASA POWER (MERRA-2), NOAA CPC ONI, USDA NASS CropScape CDL, USDA NRCS SSURGO.
