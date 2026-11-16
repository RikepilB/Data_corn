<!-- SI-assisted (Claude Code); reviewed by <name> -->
# Cómo se calcula cada resultado de Data Corn

Este documento explica la estrategia, las ecuaciones, las métricas y las reglas con las que Data Corn llega a cada conclusión. Cada fórmula y cada umbral están copiados del código del motor (`apps/api/src/datacorn/domain/agronomy/`) y de `apps/api/src/datacorn/resources/crops/maize.yaml`, con el archivo indicado en cada sección. El ejemplo de la sección 9 sale del reporte real `apps/web/public/data/reports/hamilton-ne.json`.

NASA es solo una fuente de datos: no respalda ni revisa este proyecto.

## 1. La estrategia en una frase

Data Corn toma el clima diario de unas 25 campañas pasadas en el punto del lote, simula cada campaña con el maíz, el suelo y el manejo que eligió la persona, y cuenta en cuántas campañas ocurrió cada problema. Cada campaña es un escenario, no un pronóstico. Ningún número sale de un modelo de SI: salen de fórmulas publicadas y de reglas fijas del equipo. El asistente de chat (SI) solo lee y explica el reporte ya calculado.

## 2. Datos de entrada

| Dato | Fuente | Para qué |
|---|---|---|
| Temperatura máxima y mínima, lluvia, radiación solar, humedad, viento (diarios) | NASA POWER | Grados-día, ET0, balance de agua, calor, heladas |
| Fase de El Niño (índice ONI) | NOAA CPC | Agrupar las campañas por fase |
| Suelo: textura, agua disponible, drenaje, grupo hidrológico (EE. UU.) | USDA NRCS SSURGO | Agua que guarda el suelo, escorrentía, encharcamiento |
| Suelo fuera de EE. UU. | ISRIC SoilGrids | Lo mismo, estimado por textura |
| Cultivos de años anteriores (EE. UU.) | USDA NASS Cropland Data Layer | Rotación actual |
| Verdor (NDVI) | MODIS; Sentinel-2 para zonas | Avance de la campaña, zonas del lote |

Lo que elige la persona: fecha de siembra, madurez relativa del híbrido (días), riego (secano, pivote, surco, goteo) y labranza.

## 3. Cómo se arman las campañas

`scenarios.py`, función `build`.

- Una campaña va del 1 de marzo al 31 de diciembre de la temporada pedida.
- Se arma una campaña por cada año histórico completo de NASA POWER (en el ejemplo, 2001 a 2025): los días de ese año ocupan las fechas de la temporada.
- Si la temporada ya empezó, los días ya observados se usan tal cual al inicio y el año histórico solo completa el resto.
- Si la temporada ya terminó, se usa solo el clima real de ese año.

## 4. Las ecuaciones del motor, en el orden en que se aplican

### 4.1 Grados-día y etapas del cultivo

`phenology.py`, `daily_gdd` (método 86/50 en °C).

```
Tmáx* = min(max(Tmáx, 10 °C), 30 °C)
Tmín* = min(max(Tmín, 10 °C), 30 °C)
GD del día = (Tmáx* + Tmín*) / 2 − 10
```

- Emergencia: 70 °C·día acumulados desde la siembra.
- Madurez fisiológica: los grados-día totales del híbrido, interpolados en la tabla de `maize.yaml`: 80 días → 1170, 100 días → 1390, 120 días → 1610 °C·día.
- Emisión de estigmas (floración): el 50 % de esos grados-día.
- Ventana de floración: estigmas ± 10 días.
- Cosecha: madurez + 21 días de secado en el campo.

### 4.2 Demanda de agua de referencia (ET0)

`et0.py`: Penman-Monteith de FAO-56, ecuación 6, con la radiación extraterrestre de la ecuación 21. Usa temperatura, radiación solar, humedad y viento diarios, más la altura del lote. Si falta la radiación, se estima con Hargreaves: `Rs = 0,16 × √(Tmáx − Tmín) × Ra`.

### 4.3 Agua que guarda el suelo

`ssurgo.py` y `soil.py`.

- En EE. UU.: `agua disponible (mm/m) = aws0150wta (cm en 0-150 cm) × 10 / 1,5`, de SSURGO.
- Si SSURGO no trae ese dato, o fuera de EE. UU.: Saxton y Rawls (2006), con arena, arcilla y materia orgánica (capacidad de campo menos punto de marchitez).
- Raíces: crecen en línea recta de 0,15 m en la siembra a 1,50 m en la floración (`maize.yaml`).
- `TAW (agua total disponible) = agua disponible × profundidad de raíces`.

### 4.4 Consumo de agua del cultivo

`water_balance.py`, función `simulate`.

```
Kc: 0,30 al inicio → sube hasta 1,20 → se mantiene → baja a 0,60 al madurar   (FAO-56, tabla 12)
p  = min(max(0,55 + 0,04 × (5 − Kc × ET0), 0,1), 0,8)                          (FAO-56, tabla 22)
RAW = p × TAW
Ks = 1                                si Dr ≤ RAW
Ks = (TAW − Dr) / ((1 − p) × TAW)     si Dr > RAW
ETc = Ks × Kc × ET0
```

`Dr` es el agotamiento: cuánta agua le falta al suelo para estar lleno. El suelo empieza la campaña con `Dr = 0,15 × TAW` (casi lleno tras la recarga de primavera).

### 4.5 Balance diario de agua del suelo

```
Escorrentía (número de curva SCS):
  S  = 25400 / CN − 254
  Ia = 0,2 × S
  Q  = (lluvia − Ia)² / (lluvia + 0,8 × S)   si lluvia > Ia; si no, 0
  CN por grupo hidrológico: A 67, B 78, C 85, D 89
  labranza reducida −2, siembra directa −4

Dr hoy = Dr ayer − (lluvia − Q) − riego + ETc
  si Dr < 0, el sobrante se va en percolación profunda y Dr = 0
  Dr nunca pasa de TAW
```

Riego (solo si no es secano): se riega cuando `Dr ≥ 0,5 × RAW`, una lámina de `min(Dr, capacidad × eficiencia)`. Capacidad y eficiencia por defecto: pivote 6,35 mm/día y 85 %, surco 8,0 mm/día y 65 %, goteo 6,0 mm/día y 92 %.

### 4.6 Pérdida de rendimiento por agua

`water_balance.py`, `relative_yield_loss` (FAO-33, Doorenbos y Kassam 1979).

```
1 − Ya / Ym = Ky × (1 − ΣETa / ΣETm)     de la siembra a la madurez
Ky = 1,25 para el maíz
```

`ETa` es el agua que usó el cultivo (`Ks × Kc × ET0`) y `ETm` la que habría usado sin falta de agua (`Kc × ET0`). El resultado se limita entre 0 y 1. El rendimiento relativo de la campaña es `1 − pérdida`.

### 4.7 Lo que se mide en cada campaña

`scenarios.py`, función `run`.

| Medida | Cálculo |
|---|---|
| Falta de agua en floración (mm) | Σ (ETm − ETa) durante la ventana de floración |
| Días de calor | Días con Tmáx ≥ 35 °C en la ventana de floración |
| Helada tardía | Alguna Tmín ≤ 0 °C en los 30 días después de la emergencia |
| Helada mortal | Alguna Tmín ≤ −2 °C entre los estigmas y la madurez, o el híbrido no llega a madurar |
| Semana pico | La mayor suma de 7 días seguidos de ETm |
| Riego de la campaña | Suma de las láminas aplicadas |

## 5. De las campañas a cada indicador

Todas las cuentas usan **medianas, no promedios**: la mitad de las campañas quedó por encima y la otra mitad por debajo. Los cortes en porcentaje de campañas (20 %, 45 %, etc.) los eligió el equipo; no vienen de una norma publicada.

`by_fraction(x, medio, alto)`: bajo si `x < medio`, medio si `x < alto`, alto si no (`_common.py`).

| Indicador | Qué cuenta | Regla del nivel | Archivo |
|---|---|---|---|
| Falta de agua | Campañas con falta de agua en floración ≥ 30 mm, o pérdida ≥ 15 % | Medio desde 20 % de las campañas, alto desde 45 %. Se informa la pérdida mediana | `risks.py` |
| Calor en floración | Mediana de días de calor | Bajo ≤ 1 día, medio ≤ 4, alto si no | `risks.py` |
| Heladas | % de campañas con helada tardía y % con helada mortal | Cada una: medio desde 10 %, alto desde 25 %. Vale la peor de las dos | `risks.py` |
| Híbrido | % de campañas en que madura antes de la helada mortal | Bajo ≥ 90 %, medio ≥ 75 %, alto si no | `risks.py` |
| Fecha de siembra | Se prueban 5 fechas: la elegida ± 1 y 2 semanas | Ver abajo | `risks.py` |
| Encharcamiento | Campañas con ≥ umbral de lluvia en 3 días antes de la floración | Medio desde 15 %, alto desde 35 % | `waterlogging.py` |
| Riego | Campañas que aún con riego tienen falta de agua ≥ 15 mm o pérdida ≥ 5 % | Medio desde 10 %, alto desde 30 % | `irrigation.py` |
| Avance de la campaña | Días entre el verdor de este año (NDVI ≥ 0,5) y la mediana de años anteriores | Bajo si va adelantado o a ± 5 días; medio si va 6 a 12 días atrasado; alto si más | `vegetation.py` |
| Zonas del lote | NDVI de Sentinel-2 a 10 m, mediana de varias campañas | Menos verde: más de 5 % bajo la mediana del lote; más verde: más de 5 % sobre ella | `zones.py` |

**Fecha de siembra.** Para cada fecha probada, `puntaje = mediana(rendimiento relativo) − 0,5 × (proporción de heladas tardías + proporción de heladas mortales)`. La ventana son las fechas con un puntaje a 3 puntos o menos del mejor, ampliada 3 días a cada lado. El nivel es bajo si la fecha elegida cae en la ventana o pierde 3 puntos o menos; si no, alto cuando pierde 8 puntos o más y medio en otro caso.

**Encharcamiento.** El umbral de lluvia en 3 días es 100 mm, o 75 mm si el suelo drena mal o es del grupo hidrológico D, y 10 mm menos si la pendiente media es menor a 1 %.

**Riego.** El nivel sale solo del estrés que queda a pesar del riego. Comparar la semana pico con la capacidad del equipo solo elige qué frase se muestra: si la semana pico supera la capacidad pero el agua del suelo cubre la diferencia, la frase lo dice y el nivel no sube.

## 6. Veredicto, principales riesgos y confianza

`summary.py` y `_common.py`.

- **Veredicto de la campaña:** el peor nivel entre los indicadores decisivos que tienen datos: falta de agua, calor, híbrido, heladas, riego, encharcamiento, fecha de siembra y avance de la campaña.
- **Principales riesgos:** hasta 3 indicadores decisivos que no estén en bajo, del peor al menos malo.
- **Recomendación:** la ventana de siembra y, si hay riesgos, el principal ("Siembre entre … Vigile: …").
- **Confianza de cada indicador:** alta con 20 campañas o más, media con 10 a 19, baja con menos.
- **Confianza del reporte:** baja si solo hay fuentes globales para la zona; media si falta el suelo del lote o hay más de 2 indicadores sin datos; alta en otro caso.
- **Año típico:** la campaña con la pérdida mediana.

## 7. El Niño

`enso.py`.

- Fase por el ONI: El Niño si ≥ +0,5 °C, La Niña si ≤ −0,5 °C, neutro en otro caso. Cada campaña toma la fase de los trimestres mayo-julio, junio-agosto y julio-setiembre.
- Por fase se informan medianas: falta de agua en floración, días de calor y rendimiento relativo.
- Diferencia = rendimiento relativo mediano de la fase actual − el de los años neutros. Señal débil si hay menos de 5 años en la fase o la diferencia es menor a 3 puntos; moderada si es menor a 8 puntos; fuerte si no.

## 8. Lo que calcula el navegador

Dos medidores de la película de la campaña se calculan en la web (`apps/web/src/domain/outlook.ts`), con las series que ya trae el reporte:

- **Buenas cosechas en años parecidos.** Una buena cosecha es una pérdida por agua menor a 15 %. Para cada día, cada otro año pesa `w = exp(−(Δagua² + Δrendimiento²) / 2)`, con Δagua = diferencia del agua media de los últimos 7 días dividida por 10 y Δrendimiento = diferencia del rendimiento acumulado dividida por 4. El valor es `100 × (Σ w × buena + 1 × base) / (Σ w + 1)`, donde `base` es la parte de todos los años que terminó bien. Hacen falta al menos 5 años. No es un pronóstico: es la parte de los años parecidos que terminó bien.
- **Agua para N días.** `(agua − umbral de estrés) / caída diaria media`, con la caída medida en los días secos de los últimos 10 (al menos 3). Equivale a `(RAW − Dr) / ETc`. Tope 30 días.

Nota para el equipo: la regla del proyecto dice que la web solo muestra y no calcula ciencia. Estos dos medidores la rompen. No se cambia esta noche.

## 9. Ejemplo real: lote de Hamilton County, Nebraska

Reporte `hamilton-ne.json`: 68 ha (169 acres), franco limoso, bien drenado, grupo hidrológico C, pendiente 0,9 %, agua disponible 190,5 mm/m (SSURGO). Temporada 2027, siembra 20 de abril, híbrido de 105 días, secano, labranza convencional. 25 campañas: 2001 a 2025.

| Indicador | Dato del reporte | Regla | Nivel |
|---|---|---|---|
| Falta de agua | 13 de 25 campañas (52 %) con falta ≥ 30 mm en floración o pérdida ≥ 15 %. Pérdida mediana 17 % (año típico 2023, rendimiento relativo 0,827) | 52 % ≥ 45 % | Alto |
| Calor en floración | Mediana 2 días con Tmáx ≥ 35 °C | 2 está entre 2 y 4 | Medio |
| Heladas | Tardía 4 %, mortal 0 % | Ambas < 10 % | Bajo |
| Híbrido | Madura antes de la helada en 25 de 25 | 100 % ≥ 90 % | Bajo |
| Fecha de siembra | Ventana del 17 de abril al 7 de mayo; el 20 de abril cae dentro | Dentro de la ventana | Bajo |
| Encharcamiento | 2 de 25 (8 %). Umbral 90 mm (100 mm, menos 10 por pendiente < 1 %) | 8 % < 15 % | Bajo |
| Avance de la campaña | La campaña 2027 aún no empezó | Sin datos | — |

Veredicto: **alto** (el peor nivel decisivo, falta de agua). Principales riesgos: falta de agua y calor en floración. Confianza: **alta** (25 campañas, suelo de SSURGO, solo 2 indicadores sin datos). Recomendación: "Siembre entre el 17 de abril y el 7 de mayo. Vigile: falta de agua".

Las campañas más secas fueron 2002 (rendimiento relativo 0,485, falta de 69,4 mm en floración) y 2012 (0,491, 64,1 mm).

## 10. Qué es método publicado y qué es decisión del equipo

| Publicado | Decisión del equipo |
|---|---|
| Penman-Monteith (FAO-56, ec. 6), Kc y p (FAO-56) | Los cortes de nivel: 20 % y 45 %, 10 % y 25 %, 15 % y 35 %, 10 % y 30 % |
| Respuesta del rendimiento al agua, Ky = 1,25 (FAO-33) | 30 mm y 15 % para contar una campaña con falta de agua; 15 mm y 5 % con riego |
| Grados-día 86/50 | 35 °C de calor, ± 10 días de floración, 30 días para helada tardía |
| Número de curva SCS (TR-55) | Umbrales de lluvia de 100 y 75 mm en 3 días |
| Agua disponible de Saxton y Rawls (2006) | Puntaje de la fecha de siembra (castigo de 0,5 por helada, 3 y 8 puntos) |
| Fases del ONI (± 0,5 °C, NOAA) | 5 años mínimos por fase; 3 y 8 puntos de señal |

Valores de `maize.yaml` marcados "verificar" en el propio archivo: 35 °C de calor, Kc final 0,60, raíces hasta 1,50 m, la tabla de grados-día por madurez y la floración a la mitad de los grados-día.

## 11. Lo que no está comprobado

- Los resultados no se han comparado con mediciones de lotes reales ni con registros de cosecha. Muestran cómo habría jugado el clima pasado según el modelo, no lo que rindió el lote.
- El acuerdo con la humedad del suelo de SMAP es solo una comprobación de coherencia para la rotación actual. No valida nada más.
- El modelo no lleva agua de un cultivo al siguiente y no simula la soya ni el centeno: la rotación solo cambia el riesgo de erosión.
- El rendimiento esperado y el cultivo anterior que se escriben en el formulario no cambian ningún número.

Cómo comprobarlo en la finca: una sonda de humedad del suelo, un pluviómetro y un sensor de temperatura del aire miden lo mismo que el reporte muestra como agua en el suelo, lluvia y calor. Data Corn hoy no lee sensores.

## 12. Fuentes

Las filas completas, con licencia, están en [docs/REFERENCES.md](../REFERENCES.md): FAO-56 (Allen et al., 1998), FAO-33 (Doorenbos y Kassam, 1979), Saxton y Rawls (2006), Pope (2008) para los grados-día 86/50, el número de curva SCS (USDA NRCS TR-55), NOAA CPC para el ONI, NASA POWER, USDA NRCS SSURGO y USDA NASS CDL.
