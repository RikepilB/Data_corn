<!-- SI-assisted (Claude Code); reviewed by: pendiente (Richard) -->
# Antecedentes: soluciones para maíz en EE. UU. (actuales, pasadas, fallidas, nuevas)

_2026-11-14, después de la asesoría con el mentor. Pivot: maíz, productores grandes y medianos, un estado de
EE. UU.; decisiones de **cuándo sembrar** y **en qué etapa puede faltar agua o caer el rendimiento**._

Método: unas 25 búsquedas web públicas (no hay acceso a funciones privadas de productos comerciales). Lo que
no pude confirmar está marcado **(sin verificar)**. Todas las fuentes están en §8.

## 0. Resumen en 6 líneas

1. **"Cuándo sembrar" ya existe y ya ganó Space Apps.** El Galactic Impact 2024 fue para **NVS-knot** (Kyiv):
   riesgo de siembra con SMAP + OpenET. Hoy también lo cubren MRCC Corn GDD, DAWN y NavePlant.
2. **El reto pide rotaciones, no fechas.** Hay que comparar ≥3 estrategias, incluida la actual, con por qué /
   evidencia / beneficios / vacíos / riesgos. Una herramienta solo de fecha de siembra pierde puntos en Relevancia.
3. **El hueco real:** ninguna herramienta pública compara rotaciones para *un* campo. Ninguna cruza ventana de
   siembra + riesgo de déficit hídrico en floración (VT–R1) + uso de agua + salud del suelo con años históricos.
4. **Los fracasos comerciales** (Gro Intelligence, ClimateAi, Farmers Edge) fueron plataformas amplias sin una
   decisión concreta que alguien pagara.
5. **Las herramientas que sobreviven** (U2U Corn GDD) son simples, atadas a *una* decisión y alojadas por una
   institución estable.
6. **Recomendación:** oeste de Kansas (acuífero Ogallala), con la ventana de siembra y el estrés en floración como
   *atributos de cada rotación*. Ver §5.

## 1. Mapa de soluciones

### 1.1 Activas (públicas o académicas)

| Herramienta | Quién | Qué hace | Datos NASA | Qué le falta frente a nosotros |
|---|---|---|---|---|
| **Corn GDD tool** (de U2U) | MRCC / Purdue | Prueba fechas de siembra y madurez del híbrido contra madurez fisiológica; riesgo de helada por condado | No (clima histórico) | Sin agua, sin suelo, sin rotaciones |
| **DAWN Dashboard** | UMD + UNL + otros (USDA-NIFA) | Pronóstico de etapas del cultivo y GDD por campo, hasta 6 meses, con probabilidades | No (NOAA + modelo regional CWRF) | Pronóstico estacional, no compara rotaciones |
| **FACTS** | Iowa State | APSIM en temporada: agua y N del suelo por capa, pronóstico de rendimiento, 20 sistemas | No | Solo Iowa, sitios fijos, no tu campo |
| **Hybrid-Maize** | UNL | Modelo de rendimiento potencial y limitado por agua; compara fecha de siembra y madurez | No | Software de escritorio para expertos |
| **Crop-CASMA** | USDA NASS + GMU + NASA | Mapas de humedad SMAP (9 km y 1 km) y NDVI MODIS sobre cultivos, desde 2015 | **SMAP, MODIS** | Monitoreo, no recomienda nada |
| **ESI (ALEXI)** | USDA-ARS + NASA | Índice de estrés evaporativo; alerta de sequía relámpago 2–4 semanas antes | Térmico (GOES; no confirmé ECOSTRESS) | Índice regional, no decisión de campo |
| **OpenET** | NASA + Google + otros | ET por campo a 30 m (Landsat, conjunto de 6 modelos), estados del oeste | **Landsat** | Mide agua usada; no planifica rotaciones |
| **Cover Crop Decision Tool** | Midwest Cover Crops Council | Elige cultivo de cobertura y fecha según condado, drenaje y objetivo | No | Solo coberturas, sin agua ni clima por año |
| **Climate FieldView** | Bayer (comercial) | Mapas de siembra, prescripciones de densidad, imágenes de salud del campo | Imágenes satelitales (fuente no pública) | De pago, centrado en operación, no en rotación |

### 1.2 Pasadas (proyecto terminado o estado incierto)

| Herramienta | Qué pasó | Lección |
|---|---|---|
| **Useful to Usable (U2U)**, 12 estados del Medio Oeste | Proyecto USDA terminado; las herramientas pasaron al MRCC y al HPRCC (2017). No confirmé el mantenimiento actual | La herramienta más usada fue la más simple: **Corn GDD** |
| **Planting Date Advisor** (Climate Corp) | Riesgo de helada por fecha de siembra por campo (2013). Estado actual **(sin verificar)** | Absorbido por plataformas comerciales |

### 1.3 Fallidas (empresas)

| Empresa | Qué pasó | Por qué (según la prensa) |
|---|---|---|
| **Gro Intelligence** | Cerró en jun. 2024 tras recaudar unos 117–125 M USD; activos comprados por Almanac | Ronda de inversión fallida y problema de ajuste producto-mercado |
| **ClimateAi** | Cerró operaciones en ago. 2026, con unos 38 M USD recaudados | Los clientes no tenían presupuesto fijo para "adaptación" |
| **Farmers Edge** | Fairfax la privatizó un 99 % por debajo del precio de su salida a bolsa; cierre ~mar. 2024 | Problemas de liquidez y caída de valoración |

No pude confirmar el cierre de IBM Watson Decision Platform for Agriculture ni el de Granular, así que no los cuento.

### 1.4 Nuevas (2023–2026)

| Iniciativa | Qué es | Relevancia |
|---|---|---|
| **NASA Acres** | Consorcio agrícola de NASA para EE. UU. (UMD); co-diseña herramientas con agricultores (programa FIAT) | Es el aliado natural y el "estado del arte" que los jueces conocen |
| **NavePlant** (Nave Analytics, Nebraska) | Ventanas de siembra, humedad y riesgo de helada; beta con sus clientes de riego | Producto real que salió de Space Apps 2024 |
| **SatRAP** (K-State) | OpenET para gestionar agua subterránea en Kansas. Preliminar 2026: sin impacto significativo en el rendimiento del maíz | Valida el uso de OpenET en Kansas |
| **Crop Sequence Boundaries** (USDA NASS + ERS, 2023) | Campos delineados con 8 años de rotación por polígono (CDL), descargable | **Nos da la rotación actual de cualquier campo** sin preguntar |
| **Bayer E.L.Y.** | Modelo de IA generativa agronómica; uso interno (vendedores y agrónomos) | Muestra hacia dónde va la IA: explicar, no solo mapear |

## 2. Antecedentes en Space Apps

| Año | Proyecto | Resultado | Qué hizo |
|---|---|---|---|
| 2024 | **NVS-knot** (Kyiv) | **Galactic Impact (ganador global)** | Riesgo de siembra con humedad SMAP + ET OpenET. La prensa lo asocia con Nave Analytics + VITech → NavePlant **(asociación sin verificar)** |
| 2024 | Cuberts (U. Illinois) | Ganador local, Chicago | Herramienta para agricultores, mismo reto |
| 2024 | Ometeotl: Crop Connect | Nominado global | Usó datos meteorológicos de Meteomatics |
| 2024 | "WaterWise" (OpenET, riego) | Un resultado de búsqueda lo dio como Best Use of Data; **no lo pude confirmar** | — |
| 2025 | — | No vi ganadores globales agrícolas; no leí la lista completa | Revisar `spaceappschallenge.org/2025/awards/global-winners/` |

**Consecuencia:** un juez puede recordar que "ventana de siembra con SMAP + OpenET" ganó en 2024. Hay que
diferenciarse a la vista desde la primera diapositiva.

## 3. Por qué fallan las herramientas de apoyo a decisiones

Lo que repite la literatura (sobre todo casos del Reino Unido y Europa):

- Se diseñan sin consultar al usuario. Ignoran el conocimiento tácito del agricultor y las decisiones que realmente toma.
- Hay 15 factores de adopción, entre ellos usabilidad, costo-beneficio, desempeño, **relevancia** y compatibilidad con normas.
- Barreras: complejidad percibida, poca confianza, mala interfaz y **carga de datos tediosa**.
- Los agricultores rechazan que una herramienta "salte" su propio criterio. Por eso funciona la regla del reto:
  complementar, no reemplazar.

Reglas de diseño que salen de aquí:

1. **Una decisión, un usuario, un campo.** No es una plataforma.
2. **Cero carga de datos.** Clic en el campo; la rotación actual sale de CSB y el suelo de SSURGO. El usuario solo
   ordena sus prioridades.
3. **Incertidumbre visible.** Bandas p10/p50/p90 y número de años, como ya hace el contrato.
4. **Marcar dónde decide el humano.** Cada rotación trae "riesgos para revisión local" (el contrato ya lo exige).
5. **Unidades de EE. UU.** en la interfaz: pulgadas, °F, bu/ac, acres.

## 4. El hueco (lo que nadie hace junto)

Cada herramienta resuelve una sola pieza:

- Cuándo sembrar: Corn GDD, DAWN, NavePlant.
- Humedad actual: Crop-CASMA.
- Agua usada: OpenET.
- Cobertura: MCCC.
- Rendimiento: FACTS, Hybrid-Maize.

**No encontré ninguna herramienta pública que, para un campo, compare 3–4 rotaciones (incluida la actual) en:**
- ventana de siembra,
- probabilidad de déficit hídrico en la etapa crítica (VT–R1, floración),
- demanda de riego,
- días de suelo desnudo,
- explicación con evidencia, vacíos y riesgos.

Esa combinación es lo que pide el reto. (Límite: solo vi información pública; un producto comercial podría hacer
parte de esto sin publicarlo.)

## 5. Recomendación para el pivot

### 5.1 Encuadre

> "Para tu campo de maíz: compara tu rotación actual con 3 alternativas y mira, en años secos, normales y
> húmedos, cuándo conviene sembrar, cuán seguido falta agua en floración y cuánta agua de riego exige cada una."

La fecha de siembra y la etapa crítica pasan a ser **columnas de la matriz**, no el producto. Eso cumple el reto
y nos separa del ganador de 2024.

Ejemplo de rotaciones (oeste de Kansas), a validar con el mentor:

1. **Actual:** maíz continuo con riego.
2. Maíz–soya.
3. Maíz–soya + centeno de cobertura.
4. Maíz–trigo–sorgo–barbecho, o riego limitado. El sorgo es el cultivo tolerante a sequía que el reto menciona.

Evidencia citable para las fichas:

- **Rotación vs maíz continuo:** −11 a −28 % de rendimiento para el maíz continuo (Iowa State, 7 sitios,
  2003–2013). Penalidad media de −4,3 % en secano en el Medio Oeste (748 374 registros). Son estudios distintos;
  no se comparan entre sí.
- **Etapa crítica:** con ≥4 días de estrés, hasta −9 %/día en polinización y emisión de estigmas; −1 a −5 %/día
  antes; hasta −6 %/día después. Iowa State y UW (Classen & Shaw 1970, Shaw 1988).
  **Mostrar como rango, nunca como predicción.**
- **Ahorro de agua:** el LEMA de Sheridan-6 (Kansas) usó **23,1 % menos agua subterránea**, con maíz 218 vs
  220,6 bu/ac (−1,2 %) y flujo de caja 375 vs 360 USD/ac. Los datos son autoinformados por los productores. Un
  estudio de Deines et al. (NASA Harvest) estimó ahorros unas 4,5 veces mayores que la pérdida de rendimiento.

### 5.2 Estado: opciones

| Opción | A favor | En contra |
|---|---|---|
| **A. Oeste de Kansas (GMD4, condado Sheridan)** ✅ | Escasez real: el Ogallala sur se agota y GRACE lo muestra. OpenET disponible (lo usan KGS y K-State). Evidencia local fuerte (LEMA). Rotaciones con sorgo y trigo | GRACE es grueso (~cientos de km): sirve de contexto, no por campo |
| B. Centro de Iowa | Mayor productor de maíz, secano, sequía relámpago de 2012, evidencia de rotación fuerte | FACTS ya cubre Iowa en temporada; la historia de escasez es más débil |
| C. Nebraska | El estado con más riego | NavePlant, nacido de Space Apps 2024, es de Nebraska: tema saturado |

### 5.3 Qué cambia en lo ya construido

- **Se mantiene:** el balance hídrico FAO-56 (Tareas 2–6), el contrato de fichas con rotaciones, la evidencia, los
  vacíos, los riesgos y la confianza, y la web estática.
- **Cambia:**
  - **Clima:** la señal ENSO en verano en el Corn Belt es débil e inconsistente (confirmar con el mentor). Propongo
    reemplazar "El Niño / La Niña" por **años secos, normales y húmedos** (terciles de lluvia de la temporada).
  - **Nuevas métricas:** ventana de siembra (suelo ≥ 10 °C / 50 °F y riesgo de helada, con POWER) y días de estrés
    en VT–R1.
  - **Fuentes:** el suelo sale de SSURGO/gSSURGO (USDA) en vez de SoilGrids, y la rotación actual de CSB.
- **Datos NASA:**
  - POWER: clima diario y ET0.
  - SMAP: chequeo de consistencia.
  - GRACE/GRACE-FO: tendencia del agua subterránea, como contexto.
  - MODIS o HLS NDVI: fenología.
  - OpenET (Landsat): ET real de campos regados.
  - SRTM: pendiente.
  - Cada fuente que adoptemos va a `docs/REFERENCES.md`.

## 6. Preguntas para el mentor (sobre el pivot)

1. ¿Kansas oeste o Iowa? ¿Conoce un productor o un extensionista de K-State que pueda revisar las rotaciones?
2. ¿Las 4 rotaciones de §5.1 son realistas para un productor grande de maíz con riego en el Ogallala?
3. ¿Le parece bien usar años secos, normales y húmedos en vez de ENSO para EE. UU.?
4. ¿Con qué comparamos el estrés en floración: rendimientos del condado (NASS) o Crop-CASMA?
5. ¿Qué umbral de temperatura del suelo y qué riesgo de helada usan los extensionistas de Kansas para sembrar?

## 7. Riesgos del pivot

| Riesgo | Mitigación |
|---|---|
| Relevancia: "cuándo sembrar" sin rotaciones no responde el reto | La fecha es un atributo de cada rotación (§5.1) |
| Saturación: el ganador de 2024 hizo ventanas de siembra con SMAP + OpenET | Abrir el pitch con la comparación de rotaciones y el agua del Ogallala |
| Validez: las cifras de pérdida por día vienen de estudios de 1970–1990 | Mostrar rangos con su cita; nunca "vas a perder X %" |
| Tiempo: el pivot llega con ~30 h restantes | Reusar el motor FAO-56 y el contrato; cambiar solo el sitio, el clima y las métricas |

## 8. Fuentes

**Herramientas activas y pasadas**
- MRCC Ag-Climate Tools (U2U): https://mrcc.purdue.edu/Ag-Climate-Tools
- U2U, migración de herramientas (2017): https://www.feednavigator.com/Article/2017/04/20/New-climate-data-assessment-tools-for-US-grain-farmers
- Corn GDD para siembra tardía: https://www.farmprogress.com/marketing/corn-gdd-tool-for-late-planting-decisions
- DAWN Dashboard: https://cropwatch.unl.edu/dawn-dashboard-decision-support-tool-corn-belt
- Iowa State FACTS: https://facts.extension.iastate.edu/home
- Hybrid-Maize (Yang et al. 2004): https://core.ac.uk/download/188065705.pdf
- Crop-CASMA: https://www.nass.usda.gov/Research_and_Science/Cropland/metadata/metadata_cropcasma.htm
- Crop-CASMA, uso en 2025: https://www.nesdis.noaa.gov/s3/2025-05/CropCASMA-Spring-2025.pdf
- ESI / sequía relámpago: https://www.ssec.wisc.edu/~jasono/papers/otkin_jhm_june2014.pdf
- ESI, Corn Belt 2012: https://svs.gsfc.nasa.gov/4015/
- OpenET (USGS): https://pubs.usgs.gov/publication/70226741
- OpenET en Kansas: https://www.agmanager.info/sites/default/files/pdf/23_Golden_OpenET.pdf
- Cover Crop Decision Tool: https://ag.purdue.edu/news/2020/09/improved-tool-can-help-midwest-farmers-with-cover-crop-decisions.html
- Planting Date Advisor (2013): https://hoards.com/IB_Climate-Corp-weather-crop-insights
- Climate FieldView, imágenes de salud: https://static.climate.com/features/field-health-imagery

**Empresas fallidas**
- Gro Intelligence: https://www.semafor.com/article/06/04/2024/kenyan-ai-data-gro-intelligence-startup-shuts-down
- Gro Intelligence: https://techcabal.com/2024/06/02/kenya-data-analytics-gro-intelligence-shuts-down/
- ClimateAi: https://agfundernews.com/climate-resilience-platform-climateai-winds-down-operations
- ClimateAi: https://newsletter.failory.com/p/buying-better-weather
- Farmers Edge: https://www.bnnbloomberg.ca/fairfax-offers-to-take-agritech-firm-farmers-edge-private-at-99-below-ipo-price-1.2000058
- Farmers Edge: https://m.farms.com/news/farmers-edge-enters-into-definitive-agreement-with-fairfax-to-take-farmers-edge-private-at-c-0-35-per-share-206375.aspx

**Iniciativas nuevas**
- NASA Acres: https://agri-pulse.com/articles/21897-nasa-acres-program-aims-to-advance-agriculture-global-food-security-monitoring-through-satellite-data
- NASA Acres (FIAT): https://appliedsciences.nasa.gov/what-we-do/food-security-agriculture/inside-food-security-agriculture
- Crop Sequence Boundaries: https://www.nass.usda.gov/Research_and_Science/Crop-Sequence-Boundaries/
- Bayer E.L.Y.: https://www.croplife.com/?p=98808

**Space Apps**
- Ganadores globales 2024: https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-international-space-apps-challenge-announces-2024-global-winners/
- NVS-knot: https://en.ain.ua/2025/01/17/ukrainian-team-wins-nasa-space-apps-challenge-hackathon
- Nave Analytics / NavePlant: https://siliconprairienews.com/2025/02/nebraska-startup-wins-nasas-galactic-impact-award-in-the-2024-space-apps-challenge
- Cuberts (Chicago 2024): https://siebelschool.illinois.edu/news/nasa-apps-challenge
- Ometeotl: Crop Connect: https://meteomatics.com/en/news/ometeotl-crop-connect
- Ganadores 2025: https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-announces-2025-international-space-apps-challenge-global-winners/

**Adopción de herramientas de apoyo a decisiones**
- Rose et al., Cambridge/UEA: https://www.repository.cam.ac.uk/handle/1810/261110
- Precision Agriculture (2016): https://link.springer.com/article/10.1007/s11119-016-9491-4

**Agronomía**
- Rotación (Iowa State): https://www.farmprogress.com/farming-equipment/tillage-study-corn-soybean-rotation-wins-0
- Rotación (Medio Oeste, Seifert et al. 2017): https://mssoy.org/sites/default/files/documents/seifert-et-al-agron-j-109-2017.pdf
- Estrés en floración (Iowa State): https://crops.extension.iastate.edu/cropnews/2017/07/influence-drought-corn-and-soybean
- Estrés en floración (Purdue): https://extension.entm.purdue.edu/newsletters/pestandcrop/article/drought-stress-and-indiana-corn-in-2023/
- Siembra según suelo (K-State): https://eupdate.agronomy.ksu.edu/article/spring-planting-update-soil-temperature-and-moisture-538-2

**Agua (Ogallala y LEMA)**
- Ogallala y GRACE: https://science.nasa.gov/earth/earth-observatory/satellites-investigate-irrigation-in-a-stressed-aquifer-92387/
- Ogallala (Circle of Blue): https://www.circleofblue.org/?p=61109
- LEMA (Circle of Blue): https://www.circleofblue.org/2018/agriculture/kansas-farmers-cut-ogallala-water-use-and-still-make-money/
- LEMA (NASA Harvest): https://www.nasaharvest.org/news/a-hrefhttpsnasaharvestorgnewswater-conservation-programs-can-decrease-agricultural-irrigation-while-increasing-farmerdecreasing-agricultural-irrigation-while-increasing-farmer-profitsa
