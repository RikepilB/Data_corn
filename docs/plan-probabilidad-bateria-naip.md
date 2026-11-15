<!-- SI-assisted (Claude Code); reviewed by <name> -->
# Plan: probabilidad de buena cosecha, batería de agua y foto aérea NAIP

Aprobado por el equipo el 2026-11-15. Objetivo: que la película no solo muestre el agua, sino que diga
cómo va la campaña en dos números que cualquiera entiende, y que el lote se vea con nitidez.
Ideas traídas de otros mercados: la probabilidad de ganar de las transmisiones deportivas y la
autonomía de los autos eléctricos.

Todo se calcula en la web con las series que ya manda la API (`report.runs`): no cambia el contrato,
funciona con la API, con los datos de muestra y con los reportes precalculados.

## C1. Probabilidad de buena cosecha (como la «probabilidad de ganar» del deporte)

- **Buena cosecha:** el año termina con una pérdida por agua menor al 15 % (rendimiento relativo
  ≥ 85 %). Es el mismo corte con el que el motor cuenta un año con estrés (`risks.py`, `STRESS_LOSS`).
- **Día i del año que se ve:** se compara con los otros 24 años en ese mismo día de la campaña:
  agua media de los últimos 7 días y rendimiento acumulado. Cada año pesa más cuanto más se parece
  (núcleo gaussiano) y la probabilidad es la parte del peso de los años que terminaron bien. Se suma
  el promedio de todos los años con peso 1 para no mostrar 0 % o 100 % por pocos parecidos.
- **Reglas fijas:** si el año ya perdió más del 15 %, la probabilidad es 0 (el rendimiento solo baja);
  después de la madurez es 0 o 100 según el resultado. El año mismo no se cuenta (deja uno afuera).
- **Pantalla:** medidor junto al rendimiento: número grande, línea del año hasta el cursor con la
  marca del 50 % y el cambio desde la siembra («▼ 42 pts desde la siembra»).
- **Qué no es:** no es un pronóstico. Dice qué pasó en los años que iban igual en ese momento.

## C2. Batería de agua (como la autonomía de un auto eléctrico)

- **Días de agua:** cuántos días aguanta el lote sin lluvia ni riego antes de entrar en estrés, al
  ritmo de consumo de los últimos 10 días: `(agua − umbral de estrés) / caída diaria media`. La caída
  se mide en los días sin lluvia ni riego. Tope: 30 días («30+»). En estrés: 0.
- La cuenta cierra en milímetros: con `agua = 100·(1 − Dr/TAW)` y `umbral = 100·(1 − RAW/TAW)`,
  `(agua − umbral)/caída = (RAW − Dr)/ETc`.
- **Pantalla:** batería en lugar del medidor circular de la película (la carga es el agua por encima
  del umbral; verde ≥ 10 días, ámbar 4-9, rojo < 4 o en estrés, siempre con el número) y
  «agua para N días» en la etiqueta del lote.

## C3. Foto aérea de 1 m del lote (NAIP)

- Capa `USGSImageryOnly` de The National Map (USGS), hecha con NAIP del USDA:
  `https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}`.
  Sin clave, con CORS abierto. Verificada el 2026-11-15 sobre el lote de muestra (z12 a z16).
- Va encima de Sentinel-2 (EOX) desde el zoom 13, solo dentro de EE. UU. continental (`bounds`).
  Fuera de EE. UU. el servicio responde 404 o teselas transparentes desde el zoom 13 (verificado en
  México y Canadá), y abajo queda EOX. Con clave de Google, Google la reemplaza como a EOX.
- Crédito en el mapa: «USGS The National Map: Orthoimagery (USDA NAIP)». Fila nueva en REFERENCES.

## Fuera de alcance

- Pronóstico real (sigue siendo comparación con años pasados).
- Mover estos cálculos a la API: si se mueven, cambia el contrato y hay que regenerar los reportes
  precalculados.
