# Data Corn — Contrato entre la API y la web

Los tipos exactos viven en `apps/api/src/datacorn/domain/report.py` (Python) y en `apps/web/src/domain/report.ts` (TypeScript). Este documento fija lo que los tipos no dicen: claves de texto, parámetros y qué significa cada número.

## 1. Rutas

| Ruta | Cuándo la llama la web |
|---|---|
| `POST /api/v1/fields/describe` `{geometry, season}` | Al cerrar el lote, en el paso 3 «Calculando». Descarga y deja en caché todos los datos del lote, así que puede tardar de 10 a 40 s. |
| `POST /api/v1/fields/analyze` `{geometry, season, planting_date, hybrid_rm_days, irrigation, irrigation_capacity_mm_day, tillage, yield_goal_t_ha, previous_crop}` | Al pulsar «Ver resultados». Usa la caché, así que tarda menos de 2 s. |
| `GET /api/v1/health`, `/regions`, `/demo-fields` | Apoyo |

Errores: `422 invalid_geometry {reason}`, `422 data_unavailable {source, reason}`, `501 not_implemented {detail}`.

## 2. Unidades y parámetros

- **Unidades:** todos los números van en métrico (mm, °C, ha, t/ha, mm/día).
- **Parámetros de los mensajes:** cada `Message` tiene `key` y `params`. La web da formato a los parámetros según el sufijo de su nombre:

| Sufijo | Se muestra como |
|---|---|
| `_mm` | lámina en mm o in, según las unidades |
| `_c` | temperatura en °C o °F |
| `_date` | fecha corta según el idioma (`2027-04-25` → «25 abr» / «Apr 25») |
| `_pct` | porcentaje entero («12 %») |
| `_indicator` | nombre del indicador traducido (`indicator.<valor>`) |
| `_crop` | cultivo traducido (`crop.<valor>`) |
| `_phase` | fase traducida (`enso.<valor>`) |
| sin sufijo | tal cual |

## 3. Indicadores: número clave y mensajes

| `id` | `value` / `unit` | Claves de mensaje | Parámetros |
|---|---|---|---|
| `planting_window` | `null` | `planting_window.inside` · `.early` · `.late` | `start_date`, `end_date` |
| `hybrid_fit` | años en que madura antes de la helada / `count` | `hybrid_fit.ok` · `.tight` · `.risky` | `years`, `total`, `rm` |
| `frost` | probabilidad de helada tardía, 0-1 / `fraction` | `frost.low` · `.medium` · `.high` | `late_pct`, `early_pct` |
| `flowering_water` | años con estrés en floración / `count` | `flowering_water.low` · `.medium` · `.high` | `years`, `total`, `loss_pct` |
| `flowering_heat` | mediana de días calurosos en floración / `days` | `flowering_heat.low` · `.medium` · `.high` | `days`, `threshold_c` |
| `irrigation` (solo con riego) | lámina de la semana pico / `mm_week` | `irrigation.ok` · `.tight` · `.short` | `peak_week_mm`, `capacity_week_mm`, `season_mm` |
| `season_progress` | desfase en días (+ adelantado, − atrasado) / `days` | `season_progress.ahead` · `.normal` · `.behind` · `.not_started` · `.no_data` | `days`, `season` |
| `waterlogging` | años con encharcamiento / `count` | `waterlogging.low` · `.medium` · `.high` | `years`, `total` |
| `field_zones` | `null` | `field_zones.needs_ee` | — |

Qué revisar en campo (`field_check.key`): `check.soil_probe`, `check.scout_silking`, `check.frost_low_spots`, `check.irrigation_schedule`, `check.drainage`, `check.scout_field`.

## 4. Resumen, rotación y El Niño

- `summary.recommendation`: `summary.good` o `summary.watch`, con los parámetros `start_date`, `end_date` y `main_indicator`.
- `rotation.message`: `rotation.soy_first`, con `pattern` (por ejemplo `"M S M S M"`, del año más viejo al más nuevo), `after_soy` y `after_corn` (años de cada caso en el historial).
- `rotation.options[].notes`: `rotation.note.rootworm` y `rotation.note.residue`.
- `enso.message`: `enso.weak`, `enso.moderate` o `enso.strong`, con `now_phase`, `delta_pct` (diferencia de rendimiento relativo entre la fase actual y los años neutrales) y `years` (años de la historia en esa fase). Con menos de 5 años en la fase siempre sale `enso.weak`, porque no hay evidencia suficiente.
- `rotation.message` también puede ser `rotation.corn_on_slopes`, con los mismos parámetros, cuando el lote tiene mucha pendiente y labranza convencional.

## 5. Película y franjas

- `runs[]` trae una campaña por año análogo, ordenadas por año. Si la campaña ya tiene días observados, `observed_days > 0` en todas: esos primeros días son los reales.
- `typical_year` es el año de la campaña con el rendimiento relativo mediano. Es la que se muestra por defecto.
- **Película:** el día `i` es `start + i`. Para el lote se usan `water_pct[i]` (0-100) y `tmax_c[i]`. Para el mapa de la zona, se usa la misma fecha de ese año en la capa SMAP de GIBS (hay datos desde 2015-03-31).
- **Franjas:** cada `run` es una franja. Su color sale de `relative_yield` (1.0 = azul, ≤ 0.7 = rojo) y lleva una marca si `enso_phase` es `el_nino` o `la_nina`.
- **«Años El Niño»:** en la película es la campaña con el rendimiento relativo mediano entre los años con El Niño.

## 6. Las 6 tarjetas de la pantalla

| # | Tarjeta | Fuente |
|---|---|---|
| 1 | Fecha de siembra · o · Avance del lote | `planting_window`; si la campaña ya empezó y `season_progress` tiene datos, `season_progress` |
| 2 | Agua en floración | `flowering_water` |
| 3 | Calor en floración | `flowering_heat` |
| 4 | Híbrido y helada | `hybrid_fit` (número) + `frost` (en la frase) |
| 5 | Riego · o · Encharcamiento | `irrigation` si el lote tiene riego; si no, `waterlogging` |
| 6 | Rotación | `rotation` |

## 7. Datos sin cuenta (estado actual)

Funciona sin claves, con estas fuentes:
- **Clima, humedad del suelo y altura:** NASA POWER (MERRA-2).
- **Suelo y pendiente:** USDA SSURGO, vía Soil Data Access.
- **Condado:** FCC Census Area API.
- **Cultivo por año:** USDA NASS CropScape (CDL).
- **NDVI:** MODIS MOD13Q1, vía ORNL DAAC.
- **El Niño:** NOAA CPC ONI.
- **Capas del globo:** NASA GIBS.
- **Suelo fuera de EE. UU.:** ISRIC SoilGrids.

Con cuentas se suman Earth Engine (PRISM, HLS/Sentinel-2, SMAP, zonas del lote, sequía) y NASS QuickStats (rendimiento por condado).

## 8. Con Earth Engine (`DATACORN_EARTH_ENGINE_ENABLED=true`)

Los adaptadores están escritos y probados sin red, pero **todavía no se han corrido contra Earth Engine**. Van primero en la cadena de cada región; si Earth Engine está apagado o falla, responde la fuente sin cuenta de la sección 7.

- **Zonas del lote:** `zones_geojson` deja de ser `null`. Es un `FeatureCollection` con `meta` (`source`, `first_year`, `last_year`, `seasons`, `resolution_m`) y un polígono por parche, con `properties.zone` (`low`, `medium` o `high`), `ndvi` (media de la clase) y `area_pct` (porcentaje entero del lote que ocupa la clase). Una clase es baja o alta si su NDVI está más de 5 % por debajo o por encima de la mediana del propio lote. Con la copa cerrada el NDVI se satura, así que la clase alta suele faltar: lo que el mapa separa es la zona baja. Los 15 m del borde no se clasifican (mezclan lote con camino), por eso las zonas no llegan al contorno. `seasons` cuenta solo las campañas con imágenes despejadas. El indicador `field_zones` pasa a `field_zones.low`, `.medium` o `.high` con `low_pct`, `high_pct`, `seasons` y `spread` (diferencia de NDVI entre la mejor zona presente y la baja; 0 si no hay zona baja).
- **Sequía:** `GET /api/v1/layers/drought/tiles?date=AAAA-MM` devuelve `url_template` (teselas XYZ), `min`, `max`, `unit`, `palette` y `source`: el percentil de humedad de la zona de raíces de SMAP L4 en ese mes. Un mes con menos de 10 días de datos también responde `422`. Sin Earth Engine responde `422 data_unavailable`. La web aún no usa esta ruta: sigue con la capa de NASA GIBS.
