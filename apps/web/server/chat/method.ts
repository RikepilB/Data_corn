// SI-assisted (Claude Code); reviewed by <name>
// How each result is computed, for the assistant's get_method tool. Written by hand from the
// engine (apps/api/src/datacorn/domain/agronomy/*.py, resources/crops/maize.yaml) and from
// docs/REFERENCES.md, read on 2026-11-15. It is a copy: when a threshold changes in the engine,
// change it here too. `published` is what a cited source says; `team` is what the team chose and
// an agronomist has not confirmed.

export interface MethodNote {
  /** What comes from a published, cited method. */
  published: string[];
  /** The team's own thresholds, defaults and simplifications. */
  team: string[];
  /** What this figure cannot tell. */
  limits: string[];
}

export const METHOD_TOPICS = [
  'overview',
  'water_balance',
  'yield_loss',
  'growing_degree_days',
  'planting_window',
  'flowering_water',
  'flowering_heat',
  'frost_and_hybrid',
  'irrigation',
  'waterlogging',
  'season_progress',
  'field_zones',
  'enso',
  'rotation',
  'verdict_and_confidence',
  'data_sources',
] as const;

export type MethodTopic = (typeof METHOD_TOPICS)[number];

export const METHOD: Record<MethodTopic, MethodNote> = {
  // scenarios.py (build, run, typical); docs/REFERENCES.md "NASA POWER daily"
  overview: {
    published: [
      'Daily weather for the field comes from NASA POWER (MERRA-2 reanalysis, about 0.5 degree).',
      'Soil water is a daily FAO-56 root-zone balance; the loss from water follows FAO-33.',
    ],
    team: [
      'Each past year with weather on record (2001 to 2025 in the example) is replayed on this field with the planting date and hybrid from the form. One past year is one scenario.',
      'The "typical year" is the scenario with the median loss from water.',
      'Risk levels (low, medium, high) are the share of past seasons that crossed a threshold. The thresholds are the team\'s own.',
    ],
    limits: [
      'Scenarios from past seasons, not a forecast. Nobody can say what the coming season will do.',
      'No AI computes the results: fixed equations run by ordinary code.',
      'Nothing is validated against measured yields. The only yield figure is a relative loss from water.',
      'Missing data is shown as "not available", never as zero.',
    ],
  },
  // et0.py (FAO-56 eq. 6, eq. 21), water_balance.py, resources/crops/maize.yaml
  water_balance: {
    published: [
      'Reference evapotranspiration: FAO-56 Penman-Monteith, equation 6 (Allen and others, 1998).',
      'Crop coefficient Kc for maize: 0.30 at the start, 1.20 mid-season, 0.60 at the end (FAO-56 table 12).',
      'Root depth from 0.15 m to 1.5 m and depletion fraction p = 0.55 (FAO-56 table 22).',
      'Available water of the soil from USDA NRCS SSURGO horizons; Saxton and Rawls (2006) only when SSURGO gives none.',
    ],
    team: [
      'Runoff with the SCS curve number for row crops by hydrologic soil group (A 67, B 78, C 85, D 89), lowered by 2 for reduced tillage and 4 for no-till. This method has no row in docs/REFERENCES.md yet.',
      'The Kc end value and the root depth are marked "to verify" in the crop file.',
      'With irrigation, water is applied when depletion reaches 50 % of the readily available water.',
    ],
    limits: [
      'One soil for the whole field. No water table, no carry-over of water from the previous crop.',
    ],
  },
  // water_balance.py (relative_yield_loss), maize.yaml (ky.total), REFERENCES "Doorenbos & Kassam"
  yield_loss: {
    published: [
      'FAO-33 (Doorenbos and Kassam, 1979): relative loss = Ky x (1 - actual water use / full water use), from planting to maturity, with the seasonal Ky for maize of 1.25.',
    ],
    team: [
      'Only the seasonal Ky is used. The per-stage Ky values are not.',
      'The loss shown on a card is the median across the past seasons.',
    ],
    limits: [
      'A relative loss caused by water shortage only. It is not bushels or tonnes.',
      'It leaves out nitrogen, pests, disease, hail, planting problems and management.',
      'Not validated against measured yields of this or any field.',
    ],
  },
  // phenology.py (daily_gdd, gdd_to_maturity, constants), maize.yaml, REFERENCES "Pope (2008)"
  growing_degree_days: {
    published: [
      'Growing degree days by the 86/50 method: base 10 °C (50 °F), cap 30 °C (86 °F) (Pope 2008, Iowa State University Extension).',
    ],
    team: [
      'Degree days to maturity by relative maturity: 1170 for an 80-day hybrid, 1390 for 100 days, 1610 for 120 days (°C-days, interpolated). Marked "to verify".',
      'Silking at half of those degree days. Marked "to verify".',
      'Emergence after 70 °C-days. The silking window is 10 days before to 10 days after silking. Harvest 21 days after maturity.',
    ],
    limits: ['Stage dates are estimates from temperature only, not observations of the crop.'],
  },
  // risks.py (planting_window, _score, WINDOW_TOLERANCE, HIGH_PENALTY), scenarios.py (candidate_planting_dates)
  planting_window: {
    published: ['Built on the FAO-56 water balance and growing degree days above.'],
    team: [
      'Five planting dates are simulated, 7 days apart, from 14 days before to 14 days after the chosen date.',
      'Each date gets a score: median relative yield across the past seasons minus half the frequency of frost.',
      'Dates within 0.03 of the best score form the window, widened by 3 days on each side.',
      'Risk is high when the chosen date scores 0.08 or more below the best date, medium when it is outside the window by less.',
    ],
    limits: [
      'The app does not apply a soil-temperature rule for planting.',
      'Only dates within two weeks of the chosen one are compared.',
    ],
  },
  // risks.py (flowering_water, STRESS_DEFICIT_MM, STRESS_LOSS), water_balance.py (flowering_deficit_mm)
  flowering_water: {
    published: ['FAO-56 daily water balance and the FAO-33 loss from water, as above.'],
    team: [
      'A past season counts as water-short when the crop missed 30 mm or more of water in the silking window, or the season\'s loss from water was 15 % or more.',
      'Risk is medium when 20 % or more of the past seasons were water-short, high from 45 %.',
      'The loss in the sentence is the median loss across all the past seasons.',
    ],
    limits: ['The 30 mm, 15 %, 20 % and 45 % thresholds are the team\'s own.'],
  },
  // risks.py (flowering_heat), scenarios.py (heat_days), maize.yaml (heat_stress_c)
  flowering_heat: {
    published: [],
    team: [
      'Counts days with a high of 35 °C (95 °F) or more from 10 days before to 10 days after silking. The 35 °C threshold is marked "to verify" in the crop file.',
      'The number shown is the median across the past seasons. Risk is low up to 1 day, medium up to 4 days, high above.',
    ],
    limits: ['It counts hot days. It does not estimate a loss from heat.'],
  },
  // scenarios.py (KILLING_FROST_C, late_frost, killing), risks.py (hybrid_fit, frost), maize.yaml (frost_c)
  frost_and_hybrid: {
    published: ['Maturity date from growing degree days (86/50 method).'],
    team: [
      'Late frost: a low of 0 °C or less within 30 days after emergence.',
      'Killing frost: a low of -2 °C (28 °F) or less between silking and maturity. A season where the hybrid never reaches maturity counts too.',
      'Hybrid fit: low risk when the hybrid matured before a killing frost in 90 % or more of the past seasons, medium from 75 %, high below.',
      'Frost risk: medium when either kind of frost happened in 10 % or more of the past seasons, high from 25 %.',
    ],
    limits: ['Temperatures are for a grid cell of about 50 km, not the low spots of this field.'],
  },
  // irrigation.py, water_balance.py (IRRIGATION_DEFAULTS, IRRIGATION_TRIGGER, irrigation_capacity)
  irrigation: {
    published: ['Crop water use from the FAO-56 balance.'],
    team: [
      'Compares the peak 7 days of crop water use (median across the past seasons) with what the system gives in a week: capacity x efficiency x 7.',
      'Defaults when the form gives no capacity: center pivot 6.35 mm/day at 85 % efficiency, furrow 8.0 mm/day at 65 %, drip 6.0 mm/day at 92 %.',
      'With irrigation, a season counts as stressed when the crop missed 15 mm or more in the silking window or lost 5 % or more. Risk is medium from 10 % of seasons, high from 30 %.',
      '"Just enough" means the peak week needs more than the system gives, but water stored in the soil covers the gap.',
    ],
    limits: ['No well, water right, pumping cost or energy limit is modelled. The rainfed report has no irrigation card.'],
  },
  // waterlogging.py
  waterlogging: {
    published: [],
    team: [
      'A past season counts when the heaviest 3 days of rain between planting and silking reach 100 mm (75 mm when the soil drains poorly or is hydrologic group D), 10 mm less when the mean slope is under 1 %.',
      'Risk is medium from 15 % of seasons, high from 35 %.',
    ],
    limits: ['It is a rain threshold, not a simulation of ponding or of low spots in the field.'],
  },
  // vegetation.py (GREENUP_NDVI, smooth), REFERENCES "MODIS Vegetation Indices 16-day"
  season_progress: {
    published: ['NDVI from NASA MODIS MOD13Q1 (16-day, 250 m), smoothed with a Savitzky-Golay filter.'],
    team: ['Green-up is the date the smoothed NDVI crosses 0.5, compared with the same field in other years.'],
    limits: ['Not available before the season starts or without enough satellite images.'],
  },
  // zones.py (EVEN_BELOW_PCT, UNEVEN_FROM_PCT), en.json method.field_zones
  field_zones: {
    published: ['Peak-season NDVI from Copernicus Sentinel-2 at 10 m, median of several seasons.'],
    team: [
      'Each part of the field is compared with the field\'s own median: less green when more than 5 % below it, greener when more than 5 % above.',
      'Risk is low when less than 10 % of the field is in the less-green class, medium below 25 %, high from there.',
    ],
    limits: ['Needs Earth Engine, which has not been run yet: zones are not available for the example field.'],
  },
  // enso.py (THRESHOLDS, MIN_YEARS_PER_PHASE, insight), scenarios.py (ENSO_GROWING_SEASONS)
  enso: {
    published: ['El Niño, La Niña or neutral from the NOAA CPC Oceanic Niño Index (ONI), at +0.5 °C and -0.5 °C.'],
    team: [
      'Each past season is tagged with the phase of its growing season (the May to September quarters).',
      'The effect is measured on this field: the median relative yield of the seasons in the current phase minus that of the neutral seasons.',
      'It is called weak when the current phase has fewer than 5 past seasons or the difference is under 3 points, moderate under 8 points, strong from there.',
    ],
    limits: ['The phase is the background of the season, not a forecast.'],
  },
  // rotation.py (current_strategy, _erosion), src/i18n/en.json rotation.strategy.*, REFERENCES (Iowa State rows)
  rotation: {
    published: [
      'Corn after corn yielded from almost the same to 27 % less than corn after soybean, 14 % less on average, in Iowa State plots from 2000 to 2007 (Al-Kaisi and others, Iowa State University Extension).',
      'Corn after soybean yielded 16 bu/acre more than corn after corn on average over 26 years at Nashua, Iowa (Mallarino and Pecinovsky, Iowa State University Extension).',
      'Continuous corn needs 30 to 50 lb/acre more nitrogen (Iowa State University Extension, 2019).',
      'End a cereal rye cover 10 to 14 days before planting corn (Robertson and Acharya; Robertson and Licht, Iowa State University Extension).',
    ],
    team: [
      'What the field does now is read from the last 4 years of the USDA crop map (CDL): 4 years of corn is corn after corn; corn and soybean taking turns is corn-soybean. A rye cover crop cannot be seen in that map.',
      'Erosion risk from residue is a rule on slope and tillage (thin residue: medium from 2 % slope, high from 4 %; heavy residue: medium from 6 %; no-till lowers it one level). The rule for the rye option is not verified.',
    ],
    limits: [
      'The model does not simulate yield by rotation and does not carry water between crops.',
      'There are no yield records for this field. The Iowa trial figures are evidence from elsewhere, not results for this field.',
    ],
  },
  // summary.py (DECISIVE, summarize, confidence), _common.py (confidence_by_sample)
  verdict_and_confidence: {
    published: [],
    team: [
      'The overall level is the worst level among the indicators that have data. The top risks are up to three indicators that are not low.',
      'Confidence of an indicator: high with 20 or more past seasons, medium with 10 or more, low below.',
      'Confidence of the whole report: low with global-only sources, medium when soil data is missing or more than two indicators have no data, high otherwise.',
    ],
    limits: ['Confidence describes how much data there is. It is not a measure of accuracy against real yields.'],
  },
  // docs/REFERENCES.md
  data_sources: {
    published: [
      'Weather: NASA POWER daily (MERRA-2).',
      'Soil: USDA NRCS SSURGO.',
      'Crop of each year: USDA NASS Cropland Data Layer.',
      'El Niño index: NOAA CPC Oceanic Niño Index.',
      'Vegetation, when available: NASA MODIS MOD13Q1.',
      'Map layers: NASA GIBS.',
    ],
    team: [],
    limits: ['NASA is a data source only. NASA does not endorse or review this project.'],
  },
};
