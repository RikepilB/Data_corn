<!-- SI-assisted (Claude Code); reviewed by <name> -->
# Plan: película que cuenta la campaña y globo «Hoy en el mundo»

Aprobado por el equipo el 2026-11-14. Objetivo: que la película diga cuándo sufre la planta, cuánto rinde y por qué,
y que el globo muestre las condiciones del mundo ahora (nubes, lluvia, El Niño).

## A. Película de la campaña

| # | Qué | Datos |
|---|---|---|
| A1 | Eje de meses y línea de estrés (agua por debajo de la cual la planta pierde rendimiento) | `SeasonRun.stress_pct` (nuevo) |
| A2 | Banda gris con el rango de los 25 años (percentiles 10-90) y el año elegido encima | `report.runs` (ya existe) |
| A3 | Lluvia diaria en barras y riegos como marcas | `SeasonRun.rain_mm`, `SeasonRun.irrigation_mm` (nuevos) |
| A4 | Contador de rendimiento que baja en vivo con el estrés | `SeasonRun.yield_pct` (nuevo, acumulado FAO-33) |
| A5 | Momentos clave con leyenda y pausa breve («Floración sin agua: −9 %») | Se calculan en la web a partir de A1-A4 |
| A6 | Selector de años concretos (peor año, mejor año, cada año El Niño / La Niña) | `report.runs` |
| A7 | Etiqueta sobre el lote que sigue al cursor: fecha, etapa, agua, máxima, lluvia | `SeasonRun` |

API: `SeasonRun` suma `rain_mm`, `irrigation_mm`, `yield_pct` y `stress_pct` (opcionales en el contrato: la web
funciona sin ellos). El rendimiento acumulado del día *i* es `1 − Ky · Σ(ETm − ETa)₀..ᵢ / ΣETm`, que al llegar a la
madurez coincide con `relative_yield`.

## B. Globo «Hoy en el mundo» (NASA GIBS, sin clave)

| Capa | Capa GIBS | Frecuencia |
|---|---|---|
| Nubes en color real (América) | `GOES-East_ABI_GeoColor`, `GOES-West_ABI_GeoColor` | 10 min |
| Lluvia ahora | `IMERG_Precipitation_Rate_30min` | 30 min (~6 h de retraso) |
| Temperatura del mar respecto de lo normal (El Niño) | `GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies` | diaria |
| Humedad del suelo | `SMAP_L4_Analyzed_Root_Zone_Soil_Moisture` | diaria (ya existe) |

- La hora más reciente de cada capa se lee del `GetCapabilities` de GIBS al abrir la página (con respaldo fijo).
- Indicador de El Niño con el último ONI de NOAA: `GET /api/v1/enso` (nuevo). Al tocarlo se ve la serie de los
  últimos 3 años y, con un lote analizado, la película salta a los años El Niño.
- Animación de las últimas 12 h de nubes o lluvia: pocos cuadros, precargados, en pausa por defecto.

## Fuera de alcance

- Pronóstico (todo sigue siendo escenarios de años pasados).
- Capas con clave (Earth Engine, Google).
