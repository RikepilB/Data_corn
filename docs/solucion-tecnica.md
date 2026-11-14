# Solución técnica — documento de trabajo del equipo

Reto: Field Shift: Adapting Farms with NASA Data (NASA Space Apps 2026)
Estado: borrador para construir. Valores marcados con (verificar) deben comprobarse en la fuente antes de usarlos.

---

## 1. Flujo del sistema

```
Agricultor marca su parcela + elige prioridades (agua / suelo / ingreso / riesgo)
        │
        ▼
[A] Calendario desde el espacio ── NDVI 2016-2025 (HLS/Sentinel-2 + MODIS)
        │   → temporadas de cultivo, fechas de siembra/cosecha, ventanas de suelo desnudo
        ▼
[Generador de rotaciones] ── rotación actual + ≥3 alternativas que caben en esas ventanas
        │
        ▼
[B] Gemelo de suelo y agua ── reproduce 1981-2025 de clima real sobre el suelo de la parcela
        │   (FAO-56 + escorrentía CN + erosión RUSLE) para cada rotación
        ▼
[C] Escenarios El Niño / Neutral / La Niña ── agrupa los años simulados por fase ENSO
        │
        ▼
[Validación + semáforo de confianza] ── modelo vs SMAP, lluvia CHIRPS vs IMERG vs POWER, calendario vs MIDAGRI
        │
        ▼
Resultado: 3+ rotaciones comparadas por fase ENSO, con por qué / evidencia / beneficios / vacíos / riesgos
```

Idea central: los tres módulos no son tres herramientas, son una cadena. A define *cuándo* hay espacio para cambiar, B mide *qué pasaría*, C dice *en qué tipo de año* conviene cada opción.

---

## 2. Módulo A — Calendario desde el espacio

**Datos**
- HLS (NASA Harmonized Landsat Sentinel-2) L30/S30 v2, 30 m, cada 2-3 días. GEE: `NASA/HLS/HLSL30/v002`, `NASA/HLS/HLSS30/v002`.
- Parcelas < 0,5 ha (común en la sierra): Sentinel-2 SR a 10 m. GEE: `COPERNICUS/S2_SR_HARMONIZED`.
- Relleno de huecos por nubes (época de lluvias en los Andes): MODIS MOD13Q1 250 m, 16 días. GEE: `MODIS/061/MOD13Q1`.

**Pasos**
1. Máscara de nubes (Fmask en HLS, SCL en Sentinel-2).
2. NDVI medio del polígono de la parcela; compuesto por década (10 días), mediana.
3. Rellenar huecos con MODIS ajustado por regresión lineal HLS↔MODIS en el mismo píxel.
4. Suavizado Savitzky-Golay (ventana 5 décadas, polinomio 2).
5. Temporadas: `scipy.signal.find_peaks` con prominencia ≥ 0,15 y pico ≥ 0,4.
   Inicio/fin = cruce del 20 % de la amplitud en subida/bajada.
6. Suelo desnudo = NDVI < 0,25 durante ≥ 2 décadas seguidas (umbral a ajustar por sitio).
7. Calendario típico = mediana entre años + variabilidad (rango intercuartil).

**Salida**: nº de campañas por año, meses de siembra/cosecha, ventanas desnudas (inicio, duración, variabilidad), % de datos sin nubes.

**Decisión de diseño honesta**: el módulo detecta el *calendario*, no el *tipo de cultivo*. El agricultor confirma qué siembra (lista desplegable). Clasificar cultivos automáticamente es opcional (ver 8.5).

---

## 3. Módulo B — Gemelo de suelo y agua

### 3.1 Clima diario (1981-2025)
- NASA POWER API, comunidad AG, punto diario:
  `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR&community=AG&longitude={lon}&latitude={lat}&start=19810101&end=20251231&format=JSON`
- Lluvia principal: CHIRPS diario 0,05° (1981-). GEE: `UCSB-CHG/CHIRPS/DAILY`.
- Lluvia de contraste: GPM IMERG V07 (2000-). GEE: `NASA/GPM_L3/IMERG_V07` / `NASA/GPM_L3/IMERG_MONTHLY_V07`.
- Alternativa / relleno: ERA5-Land diario. GEE: `ECMWF/ERA5_LAND/DAILY_AGGR`.

**Corrección por altitud** (clave en los Andes): la celda de POWER (~0,5° × 0,625°) tiene una altitud media distinta de la parcela.
`T_parcela = T_celda − 0,0065 × (z_parcela − z_celda)` con z de NASADEM (`NASA/NASADEM_HGT/001`). Validar el gradiente con estaciones SENAMHI si se consiguen.

### 3.2 Evapotranspiración (FAO-56)
- ET0 Penman-Monteith diaria (FAO-56, ec. 6) con los parámetros de POWER.
- ETc = Kc × ET0 (coeficiente único), con curva de Kc por etapas (inicial, desarrollo, media, final).
- Suelo desnudo entre cultivos: Kc ≈ 0,15-0,3 según humedad superficial (evaporación).

### 3.3 Balance hídrico de la zona de raíces
- `TAW = 1000 × (θFC − θWP) × Zr`   `RAW = p × TAW`
- `Dr,i = Dr,i−1 − (P − RO)i − Ii + ETc,i + DPi`
- Estrés: `Ks = (TAW − Dr) / ((1 − p) × TAW)` cuando `Dr > RAW`; `ETc,aj = Ks × Kc × ET0`.
- Secano (sierra): contar **días de estrés** (Ks < 1) por campaña.
- Riego (costa): riego simulado cuando `Dr > RAW` → **m³/ha por campaña**.
- θFC y θWP: textura y carbono orgánico de SoilGrids (GEE community: `projects/soilgrids-isric/sand_mean`, `clay_mean`, `soc_mean`, `bdod_mean`) + función de pedotransferencia Saxton & Rawls (2006).

### 3.4 Escorrentía (SCS Curve Number, diaria)
- `S = 25400/CN − 254` (mm);  `RO = (P − 0,2S)² / (P + 0,8S)` si `P > 0,2S`, si no 0.
- CN según grupo hidrológico (de la textura) y cobertura: suelo desnudo > cultivo en hileras > cereal > leguminosa densa/cobertura. Valores de USDA TR-55 (verificar).
- Esto hace que un cultivo de cobertura **infiltre más agua** en el modelo, no por decreto.

### 3.5 Erosión (RUSLE, mensual)
- `A = R × K × LS × C × P`
- R (erosividad) desde lluvia CHIRPS (Renard & Freimund 1994, o índice de Fournier modificado), distribuida por mes.
- K desde SoilGrids (ecuación EPIC de Williams).
- LS desde la pendiente de NASADEM.
- C mensual: rotación actual desde NDVI observado `C = exp(−2 × NDVI / (1 − NDVI))` (van der Knijff); alternativas desde curvas de cobertura de cada cultivo.
- Observación clave: R, K y LS son iguales para todas las rotaciones de una parcela. **La diferencia entre rotaciones sale solo de C mes a mes**, o sea, de cuánto suelo queda desnudo cuando más llueve. Es exactamente el mensaje del reto.

---

## 4. Módulo C — Escenarios El Niño / La Niña

- **ONI** (NOAA CPC): `https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt`
- **ICEN** (ENFEN, Perú) para la costa peruana. Motivo: en 2017 hubo un El Niño costero devastador en el norte del Perú con ONI casi neutral. Un índice global solo no lo ve.
- Campaña agrícola: agosto-julio (convención MIDAGRI).
- Clasificación de cada campaña: ONI medio de NDJ ≥ +0,5 → El Niño, ≤ −0,5 → La Niña, si no Neutral. Costa peruana: El Niño costero según la definición de ENFEN (≥ 3 meses consecutivos en condición cálida del ICEN).
- Se corre el módulo B para cada campaña 1981-2025 y cada rotación → distribución de resultados por fase.
- Salida tipo: "En 7 de 9 campañas El Niño, la rotación B tuvo menos días de estrés que la actual".
- Pronóstico: el usuario elige la fase esperada (o se toma del comunicado oficial ENFEN / NOAA CPC vigente) y la herramienta resalta ese escenario.

---

## 5. Generador y comparador de rotaciones

**Estrategias (mínimo 3 + la actual, como pide el reto)**
0. Actual: calendario detectado + cultivos que declara el agricultor.
1. Actual + cultivo de cobertura en la ventana desnuda (elegido por duración de la ventana, riesgo de helada y humedad disponible).
2. Sustituir un cultivo por una leguminosa (fijación de N) o uno tolerante a sequía, según el riesgo ENSO del sitio.
3. Rotación diversificada / tradicional del lugar (sierra: papa → quinua o cebada → haba o tarwi → descanso).

**Indicadores por rotación y por fase ENSO**
- Agua: días de estrés (secano) o m³/ha de riego (costa).
- Suelo: erosión t/ha/año, días al año con cobertura, aporte de N de leguminosas (valores de literatura, citados).
- Riesgo: peor caso entre fases ENSO; probabilidad de helada en etapas sensibles.
- Ingreso (opcional, aproximado): precios SISAP-MIDAGRI × rendimientos típicos regionales. Marcado como estimación.

**Puntaje**: indicadores normalizados × pesos de las prioridades del agricultor (deslizadores).

**Tarjeta de explicación** (los 5 puntos que pide el reto), generada desde los números calculados, nunca inventada:
- Por qué se sugiere · Qué evidencia la respalda · Beneficios · Vacíos de información · Riesgos que debe revisar un agricultor o técnico local.
- Si se usa un LLM para redactar en lenguaje sencillo, solo recibe los números ya calculados y se declara en el campo SI.

---

## 6. Semáforo de confianza (por parcela y por recomendación)

| Señal | Verde | Amarillo | Rojo |
|---|---|---|---|
| Correlación de anomalías modelo vs SMAP en ese píxel | r ≥ 0,6 | 0,4-0,6 | < 0,4 |
| Acuerdo de lluvia mensual CHIRPS vs IMERG vs POWER | alto | medio | bajo |
| % de observaciones NDVI sin nubes | ≥ 60 % | 30-60 % | < 30 % |
| Origen de parámetros del cultivo | FAO-56 | literatura | análogo |

Umbrales iniciales; ajustarlos tras ver los primeros resultados.

---

## 7. Validación — números que se muestran en la app y en la entrega

1. **Humedad del suelo**: modelo vs SMAP L4 (zona radicular, 9 km, `NASA/SMAP/SPL4SMGP`) o SMAP L3 mejorado (superficie, `NASA/SMAP/SPL3SMP_E`), 2015-2025. Métricas: correlación de anomalías y ubRMSE. Se valida la dinámica del clima + suelo a escala de píxel, no la parcela exacta (decirlo así).
2. **Lluvia**: CHIRPS vs IMERG vs POWER, mensual; estación SENAMHI si se consigue.
3. **Calendario**: meses de siembra/cosecha detectados vs calendario de siembras de MIDAGRI para la provincia.
4. **Eventos conocidos**: las anomalías de 1997-98 y 2017 en Piura deben aparecer claramente; 2017 detectado por ICEN aunque el ONI estaba neutral.
5. (Opcional) **EE. UU.**: calendarios detectados en parcelas CropScape (`USDA/NASS/CDL`) vs informes USDA Crop Progress.

---

## 8. Biblioteca de cultivos (inicio)

Kc de FAO-56 Tabla 12 (ini / media / final) — todos (verificar en la tabla).

| Cultivo | Kc ini / med / fin | Raíz (m) | p | Fija N | Helada |
|---|---|---|---|---|---|
| Papa | 0,50 / 1,15 / 0,75 | 0,4-0,6 | 0,35 | no | media (nativas: alta) |
| Maíz grano | 0,30 / 1,20 / 0,60 | 1,0-1,7 | 0,55 | no | baja |
| Cebada | 0,30 / 1,15 / 0,25 | 1,0-1,5 | 0,55 | no | alta |
| Haba seca | 0,50 / 1,15 / 0,30 | 0,5-0,7 | 0,45 | sí | media-alta |
| Frijol seco | 0,40 / 1,15 / 0,35 | 0,6-0,9 | 0,45 | sí | baja |
| Algodón | 0,35 / 1,15-1,20 / 0,70-0,50 | 1,0-1,7 | 0,65 | no | baja |
| Arroz | 1,05 / 1,20 / 0,90-0,60 | 0,5-1,0 | 0,20 | no | baja |
| Soya | 0,40 / 1,15 / 0,50 | 0,6-1,3 | 0,50 | sí | baja |
| Alfalfa (por corte) | 0,40 / 1,20 / 1,15 | 1,0-2,0 | 0,55 | sí | media |
| Quinua | ~0,5 / ~1,0 / ~0,7 (literatura, p. ej. García et al. 2003) | 0,5-1,0 | ? | no | alta |
| Tarwi | sin valor FAO → análogo leguminosa de grano | — | — | sí | alta |
| Vicia / avena (cobertura) | análogo | — | — | vicia sí | alta |

Quinua y tarwi sin coeficiente FAO = **vacío de información que se muestra al usuario** (suma en Validez, no resta).
Fuentes complementarias: FAO ECOCROP (rangos de temperatura y lluvia), FAO GAEZ (aptitud por zona).

### 8.5 Opcional: tipo de cultivo automático
Entrenar un clasificador sobre series NDVI etiquetadas con CropScape en EE. UU. y probar la transferencia a LatAm. Solo si sobra tiempo.

---

## 9. Arquitectura y stack

- **Pipeline (Python)**: `earthengine-api`, `requests`, `pandas`, `numpy`, `scipy`.
  - `fetch_power.py`, `fetch_gee.py`, `enso.py`, `phenology.py`, `waterbalance.py`, `erosion.py`, `rotations.py`, `confidence.py`, `build_site.py`
  - Pre-calcula todo para los sitios piloto → `data/sites/<sitio>.json`.
- **Web**: sitio estático (React + Vite o JS simple) + Leaflet (mapa) + ECharts (gráficos). Inglés por defecto (requisito de los jueces), botón ES/PT.
- **Hosting**: GitHub Pages o Vercel → enlace público sin registro.
- **Opcional**: modo "cualquier punto de LatAm" con backend (FastAPI) usando POWER + CHIRPS en vivo. Solo si sobra tiempo.
- **Repositorio**: licencia Apache-2.0, README en inglés con fuentes y licencias de datos.

---

## 10. Sitios piloto (propuesta)

| Sitio | Por qué |
|---|---|
| Altiplano de Puno (~3 850 m) | heladas, secano, papa/quinua/haba, rotación tradicional con descanso |
| Bajo Piura / valle del Chira | riego, arroz/algodón/maíz, El Niño costero (1998, 2017, 2023) |
| Corredor Seco centroamericano (p. ej. sur de Honduras) | maíz/frijol de pequeños productores, sequías en El Niño; prueba de que escala fuera del Perú |

---

## 11. Fuentes a citar en la entrega

NASA: POWER, SMAP, GPM IMERG, HLS, MODIS, NASADEM/SRTM (+ GLDAS si se usa).
ESA / Copernicus: Sentinel-2, ERA5-Land.
Otras: CHIRPS (UCSB CHC), SoilGrids (ISRIC, CC-BY 4.0), NOAA CPC ONI, ENFEN ICEN, FAO-56, FAO ECOCROP, FAO GAEZ, USDA TR-55 (CN), MIDAGRI (calendarios, SISAP), SENAMHI, USDA CropScape (si se usa). Todas las librerías de código.

---

## 12. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Registro de Google Earth Engine demora | POWER API + descargas directas (CHIRPS por HTTP, SMAP/HLS vía Earthdata/AppEEARS) |
| Nubes en la sierra | relleno MODIS + mediana multi-año + bajar la confianza |
| Falta de tiempo | recortar en este orden: modo cualquier punto → validación EE. UU. → ingreso → 3er sitio |
| Prometer demasiado | lenguaje "puede", vacíos visibles, "revisar con técnico local" |
| Jueces no pueden abrir la web | sitio estático, sin login, probar en incógnito, clasificación FortiGuard |
| Reglas de uso de IA (SI) | anotar dónde se usa IA durante el trabajo; marca de agua en imágenes generadas; nada de logos NASA |
