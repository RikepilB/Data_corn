<!-- SI-assisted (Claude Code); reviewed by: pendiente (Richard) -->
# Validación global: soluciones parecidas, activas, pasadas y fallidas (EE. UU., LatAm, Europa, Asia, Oceanía, África)

_2026-11-14. Continúa [ANTECEDENTES-maiz-EEUU.es.md](ANTECEDENTES-maiz-EEUU.es.md) (que cubre EE. UU. y Space Apps). Aquí
se amplía a las otras cinco regiones y se buscan **gemelos**: herramientas que hagan lo mismo que Field Shift._

## 0. Método y límites (leer primero)

- ~35 búsquedas web nuevas (2026-11-14), además de las ~25 del documento de EE. UU. El buscador está sesgado a inglés y a EE. UU.; en LatAm, Asia y África probablemente
  me perdí herramientas locales en idiomas locales.
- **Nivel de evidencia.** **A** = leí la página primaria. **B** = resumen de búsqueda con fuente enlazada, sin abrir la
  página. Solo **RotationARM/CropARM** es **A** (blog de UniSQ, abierto en Chrome). Todo lo demás es **B**.
- Firecrawl no funciona (clave revocada), así que no pude scrapear PDFs. Lo que no pude confirmar está marcado
  **(sin verificar)**.
- No tengo acceso a funciones privadas de productos comerciales. Un producto de pago podría hacer parte de lo nuestro sin
  publicarlo.
- No toqué `docs/REFERENCES.md`: esas filas son para fuentes que usamos en el producto, y esto es contexto.

## 1. Resumen en 8 líneas

1. **No encontré una herramienta idéntica** que, para un campo, compare 3–4 rotaciones en años secos/normales/húmedos con
   ventana de siembra + días de estrés en floración + riego, con datos NASA, gratis y sin login.
2. **Sí hay tres gemelos parciales** que un jurado informado puede nombrar: **RotationARM** (Australia), **Crop Water
   Allocator** (K-State, *en Kansas*, nuestro sitio) y **Fruchtfolge** (Alemania). Hay que citarlos y diferenciarse.
3. **"Cuándo sembrar" es la categoría más común del mundo y casi siempre es pública:** ZARC (Brasil, desde 1996),
   KATAM Terpadu (Indonesia, web desde 2011), SENAMHI (Perú), comités agroclimáticos (Colombia), SEPA (Argentina), Google
   + Ministerio de Agricultura (India, 38 millones de agricultores por SMS), TAMSAT-ALERT (África). Valida que el problema
   es real; también significa que "fecha de siembra" sola no es novedad.
4. **"Cuándo regar" también está resuelto** (KanSched, WISE, iCrop, Irré-LIS, CROPWAT, IrriMate, WaterWise). Responden
   una acción dentro de la temporada, no "qué rotación".
5. **Los planificadores de rotación existentes comparan casi solo dinero** (Cashcropper, Granular ROI, Omnia, Fruchtfolge,
   la herramienta finlandesa). RotationARM y CWA añaden agua/clima, pero en una sola región cada uno.
6. **Fracasan las plataformas amplias y sin comprador claro** (Gro, ClimateAi, Farmers Edge, Mineral, FarmWise…).
   **Sobreviven las herramientas públicas, estrechas y con institución detrás** (ZARC 30 años, KATAM 15).
7. **El método es portable, el suelo no:** FAO-56 + NASA POWER son globales; SSURGO es solo EE. UU. (en otra región iría
   SoilGrids, que ya teníamos antes del pivot). Es un argumento de escala para el pitch, **no probado**.
8. **Acción para el equipo:** una diapositiva "Lo que ya existe" con 4 nombres (ZARC, RotationARM, CWA, NavePlant) y una
   línea de diferenciación; y una pregunta nueva al mentor sobre CWA (§6).

## 2. Los gemelos (lo más importante)

| | **RotationARM / CropARM** | **Crop Water Allocator (CWA)** | **Fruchtfolge** | **Field Shift (nosotros)** |
|---|---|---|---|---|
| Quién | UniSQ + Queensland DPI | K-State, Mobile Irrigation Lab | U. de Bonn (open source) | DataCorn |
| Región | 24 sitios de Queensland y NSW | Oeste de Kansas | Alemania | Oeste de Kansas (piloto) |
| Qué compara | Estrategias multianuales de cultivo, con efectos *entre* cultivos | Qué cultivo o mezcla conviene con agua limitada, por retorno neto | Qué cultivo (y de cobertura) va en cada parcela, por beneficio | 4 rotaciones de maíz, por año seco/normal/húmedo |
| Motor | APSIM, 22,9 M de simulaciones precalculadas | Funciones de rendimiento por agua (investigación de K-State) | Programa lineal entero + normas de N y "greening" | Balance hídrico FAO-56 |
| Agua | Sí (modelo de cultivo) | Sí, como insumo de riego | No la vi | Sí: estrés por etapa y riego |
| Ventana de siembra | No confirmada (CropARM sirve para decisiones pre-temporada) | No la vi | No | Sí, columna por rotación |
| Variabilidad climática | Sí (escenarios) | Permite elegir nivel de lluvia anual | No | Sí, terciles de lluvia |
| Datos NASA | No | No | No | Sí (POWER, SMAP, GRACE…) |
| Acceso | En línea en ARMonline.com.au (**precio sin verificar**) | Herramienta de K-State (acceso actual **sin verificar**) | Web + GitHub | Web estática, sin login |
| Evidencia | **A** (UniSQ) + artículo 2026 | B | B | — |

Datos de RotationARM: Grewer, Zull, Anderson y Pembleton, *Computers and Electronics in Agriculture* 247 (2026); 12
talleres con 65 interesados. CropARM compara escenarios de N y margen bruto; RotationARM investiga los efectos temporales
entre cultivos.

**Cómo nos diferenciamos (honesto):**

- **Contra RotationARM:** otra región, datos NASA abiertos, y un resultado explicable por campo en vez de una base de 22,9 M
  de simulaciones. **Ellos nos ganan** en validación (ensayos de campo) y en efectos entre cultivos.
- **Contra CWA:** CWA reparte agua limitada entre cultivos por dinero; nosotros comparamos *sistemas de rotación* en años
  distintos y mostramos cuándo y en qué etapa falta agua. Son complementarios. **Riesgo:** un productor o extensionista de
  K-State puede decir "eso ya lo hace CWA".
- **Contra Fruchtfolge:** optimiza beneficio con normas europeas; no usa agua ni clima por año.
- **Brecha que declaramos:** RotationARM modela efectos entre cultivos. Nuestro balance de agua es continuo (el agua del
  suelo sí pasa de un cultivo al siguiente, limitada por la zona radicular del día), pero no modelamos nitrógeno, residuos
  ni efectos de la rotación en el rendimiento. Cada ficha lo dice en "vacíos" (Tarea 9 del plan).

Otros parciales: **NavePlant** (Nave Analytics, Nebraska; ventanas de siembra por humedad, riesgo cada 100 m, proyección a
dos semanas; nació de un hackatón con datos NASA; Sentinel Ag + Nave anunciaron alianza, dic. 2025 **(fecha sin verificar)**) y
**Yield Prophet** (Australia; APSIM; curvas de probabilidad de rendimiento al cambiar fecha de siembra o variedad;
suscripción).

## 3. Mapa por región

### 3.1 Estados Unidos (adicional a lo ya documentado)

| Herramienta | Quién | Qué hace | Estado | Falta frente a nosotros |
|---|---|---|---|---|
| **KanSched 2** | K-State (Mobile Irrigation Lab) | Balance de agua del suelo con ET para programar riego por campo | Activa (v2) | Solo riego, no rotaciones |
| **WISE, DIEM, iCrop** | CSU, Texas, UC Davis (proyecto Ogallala, USDA-NIFA 2016–2021) | Programación de riego; iCrop optimizada para Kansas y California | Activas **(sin verificar vigencia)** | Solo riego |
| **Granular ROI calculator** | Granular | Maíz vs. soya por rentabilidad | Activa **(sin verificar)** | Solo dinero |
| **TAPS** (Testing Ag Performance Solutions) | Nebraska | Programa apoyado por el proyecto Ogallala; no vi si es herramienta de decisión | **(sin verificar)** | — |

Contexto: en el oeste de Kansas el riego es casi el 95 % del uso total de agua. Es la razón de elegir el sitio.

### 3.2 Latinoamérica

| Herramienta | Quién | Qué hace | Estado | Falta frente a nosotros |
|---|---|---|---|---|
| **ZARC + app Plantio Certo** | Embrapa + Ministerio de Agricultura (Brasil) | Dónde y cuándo sembrar por riesgo climático, cada decendio; 43 cultivos en la app; incluye maíz safrinha y maíz-braquiaria | Oficial desde 1996; portarias anuales | Fecha por riesgo; no compara rotaciones ni muestra etapa crítica por campo |
| **Agroclimático de maíz** | SENAMHI (Perú) | Boletines de riesgo por fase fenológica; Mesa Técnica Agroclimática de San Martín | Activos (2023–2025) | Boletín regional, no por campo |
| **Aptitud agroclimática** | SIAP (México) | Potencial de cultivos por suelo, clima y fenología (el reporte que vi era de frijol) | Activo | Mapa de aptitud, no decisión |
| **SEPA** | INTA (Argentina) | Balance hídrico del suelo cada década, hasta 2 m; sirve para fecha de siembra | Activo | Monitoreo; recomienda por agua almacenada, no compara rotaciones |
| **Agroclimático + CERES-Maize** | CIAT/CCAFS (Colombia) | Pronóstico estacional + modelo de cultivo; mejor fecha de siembra con ~15 días de precisión | Piloto/proyecto; cobertura actual **(sin verificar)** | Por comité regional |
| **Agrosmart, Climatempo Agroclima PRO** | Empresas (Brasil) | Plataformas comerciales de clima y suelo para sembrar; Agrosmart dice ~100 000 agricultores y 9 países | Activas | De pago, no públicas |

Sin información: Chile (no hallé resultados).

Resultado citable de Colombia: en 2014, 170 arroceros evitaron unos 1,7 M USD en pérdidas siguiendo la recomendación de
no sembrar (arroz, no maíz).

### 3.3 Europa

| Herramienta | Quién | Qué hace | Estado | Falta frente a nosotros |
|---|---|---|---|---|
| **Irré-LIS** | Arvalis (Francia) | Balance hídrico simple; fechas previstas de etapas; riego del maíz desde ~10 hojas | Activa (usada por cooperativas y Cámaras de Agricultura) | Riego, no rotaciones |
| **MAGDA** | Horizon Europe (FutureWater, SPHY) | Pronóstico de eventos extremos + consejo de riego, panel o sistema de gestión | Proyecto de investigación | Riego, no rotaciones |
| **ClimField (Polonia), SeBS (Austria)** | ESA / Copernicus | Imágenes Sentinel para decidir si regar y cuánto | Pilotos de servicio **(vigencia sin verificar)** | Riego |
| **Irrigsat** | Empresa | Observación satelital + sondas + modelo de agua; pilotos en Europa y Sudáfrica | Piloto | De pago |
| **Fruchtfolge** | U. de Bonn | Ver §2 | Activa, código abierto | Sin agua |
| **Planificador finlandés** | Investigación | Reordenar cultivos para diversificar rotaciones con economía por paso | Académica | Sin agua ni clima |
| **Omnia** | UK | Costea escenarios de rotación y maquinaria | Comercial | Solo dinero |

Política (contexto): en 2025 la UE flexibilizó la norma BCAM 7 (rotación); se permite la diversificación en lugar de la
rotación y se reportó una exención para explotaciones pequeñas (30 ha). **Estado final sin verificar.** El "tirón" de
rotación por norma europea es menor de lo que parece.

### 3.4 Asia

| Herramienta | Quién | Qué hace | Estado | Falta frente a nosotros |
|---|---|---|---|---|
| **Pronóstico del monzón con IA** | Google (NeuralGCM) + Ministerio de Agricultura de la India | Inicio del monzón hasta un mes antes; mensajes SMS sobre cuándo sembrar, cambiar de cultivo o esperar; 38 M de agricultores (2025) | Activa | Una decisión (fecha), por región; resultados de adopción aún por medir |
| **Meghdoot / Mausam** | IMD, IITM, ICAR (India) | Avisos agrometeorológicos | Activas; en 2024 se cerraron las 199 unidades distritales de IMD; se habló de reactivarlas **(estado sin verificar)** | Boletín |
| **KATAM Terpadu** | Ministerio de Agricultura (Indonesia) | Calendario de siembra web por distrito (kecamatan); v3.1; arroz sobre todo | Activa desde 2011 | Calendario, no rotaciones; adopción desigual |
| **CropWatch Cloud / FieldWatch** | Academia China de Ciencias | Monitoreo de cultivos con satélites y app para agricultores | Activa (2025) | Monitoreo |
| **Smart farm satelital** | LG CNS / Gyeonggi (Corea) | Salud del cultivo por satélite; plataforma Gyeonggi planeada para 2028 | Piloto | Monitoreo |

Cuidado con Farmonaut: casi todos los datos de Asia en el buscador venían de su blog comercial; no los usé.

### 3.5 Oceanía

| Herramienta | Quién | Qué hace | Estado | Falta frente a nosotros |
|---|---|---|---|---|
| **RotationARM / CropARM** | UniSQ + QLD DPI | Ver §2 | Activa (ARMonline) | Otra región |
| **Yield Prophet** | Birchip Cropping Group + CSIRO | APSIM web por potrero; probabilidad de rendimiento por fecha de siembra, riego o N | Activa, suscripción | De pago, requiere datos del usuario |
| **WaterWise** | CSIRO + Goanna Ag (Australia y EE. UU.) | Decisión de riego por estrés hídrico medido y pronosticado | Activa, comercial | Riego |
| **IrriMate / IrriSET** | NIWA (ahora Earth Sciences NZ desde 1-jul-2025) | Riego y estrategia según suelo, agua e infraestructura | Programa Irrigation Insight **(vigencia sin verificar)** | Pastura y riego |
| **SWAN Systems** | Perth | Presupuesto de agua y nutrientes en web; >5 000 ha de cultivos regados | Activa, comercial | No son rotaciones |

Esto aclara un punto abierto: el "WaterWise" de CSIRO **existe**, pero sigue **sin verificar** que un proyecto de Space Apps
2024 se llamara así.

### 3.6 África

| Herramienta | Quién | Qué hace | Estado | Falta frente a nosotros |
|---|---|---|---|---|
| **TAMSAT-ALERT** | Equipo TAMSAT **(institución sin verificar)** | Herramienta de humedad del suelo; probada con 30 000+ observaciones en Kenia, Ruanda, Uganda, Zambia y Malaui; sembrar en el momento óptimo subiría el rendimiento 7–10 % (hasta 20 % en siembra tardía) | Investigación, resultados 2022–2023 | Solo fecha; lluvia y humedad |
| **Calendario de cultivo de Ghana** | CGIAR / Alliance Bioversity-CIAT | Calendario agrícola; plan de IVR, audio y app con retroalimentación | Proyecto | Calendario |
| **ClimateSERV y AgriSERV** | SERVIR (NASA y socios) | Lluvia (CHIRPS), NDVI y pronóstico a 180 días; AgriSERV evalúa intervenciones | Activas | Monitoreo, no recomiendan |
| **Servicio de ventana de siembra (Kenia)** | Tomorrow Now **(según una entrevista)** | ~15 000 agricultores; barreras de alfabetización con SMS | Activo **(sin verificar)** | Una decisión |
| **Farmer.Chat** | Digital Green | Asistente de IA por texto, voz e imagen; India, Kenia, Etiopía, Nigeria, Brasil y Zimbabue; ">8 M de respuestas" y "70 % aplica el consejo en 30 días" (cifras de la propia organización) | Activo | Consejo general, no por campo |

Lección repetida: en África el consejo llega por SMS o voz. Nuestra web asume un productor grande con pantalla y datos; no
es el mismo usuario.

### 3.7 Global

- **FAO CROPWAT y AquaCrop:** gratuitas, balance hídrico y respuesta del rendimiento al agua. Una revisión señala "poca
  evidencia de adopción generalizada" por los agricultores. Son la base técnica de lo que hacemos (FAO-56).
- **NASA Acres, NASA Harvest y Crop-CASMA:** ya cubiertos en el documento de EE. UU. Son los aliados naturales.

## 4. Fallidas y en crisis

| Caso | Qué pasó | Lección |
|---|---|---|
| **Gro Intelligence** (Nairobi/NY) | Cierre en jun. 2024 con unos 115–125 M USD levantados | Plataforma amplia sin ajuste producto-mercado |
| **ClimateAi** | Cierre en 2026, ~38 M USD levantados | Clientes sin presupuesto fijo para "adaptación" |
| **Farmers Edge** | Privatizada 99 % bajo el precio de salida a bolsa (2024) | Liquidez y valoración |
| **Mineral (Alphabet)** | Cierra operaciones y pasa a licenciar su software e IA | Hasta las grandes dejan los productos amplios |
| **FarmWise, Guardian Agriculture, Monarch Tractor, 80 Acres** | Cierres 2025–2026 | Casi todos son hardware o cultivo interior, menos comparables a nosotros; confirman el apetito bajo de inversión |
| **WeFarm, iProcure** (Kenia) | Cierres; iProcure llegó a >1 M de agricultores | Alcance no es ingreso |
| **IMD: 199 unidades agromet** (India) | Cerradas en mar. 2024 por decisión de gasto; se habló de reactivar | **Los servicios públicos también mueren por recorte** |
| **Indigo Ag** | Tres rondas de despidos; escisión de ENAI; fusión con CIBO en "Terion" (jun. 2026) **(sin verificar)** | Reestructura continua |
| **BharatAgri** (India) | Un titular dice que cerró por no lograr nueva ronda **(solo vi el título)** | — |

Cifras del sector: la Universidad de Nebraska-Lincoln contó ~18 empresas agtech cerradas o liquidadas en 2025 y concluyó que
el problema fue económico y de adopción, no de ciencia. GSMA/MicroSave: solo el 13 % de los pequeños agricultores está
registrado en agtech digital y el 5 % la usa activamente.

**Patrón:** (1) amplitud sin decisión concreta, (2) comprador sin presupuesto, (3) dependencia del capital de riesgo. Las
que duran son estrechas y están sostenidas por una institución (Embrapa, Balitbangtan, K-State, CSIRO/BCG).

## 5. Potenciales y nuevas (señales a favor)

- **IA + SMS a escala (India, 2025):** muestra que el consejo de siembra por pronóstico llega a decenas de millones por menos
  de medio centavo por agricultor (informe de U. de Chicago). Valida el problema; no valida nuestra solución.
- **Asistentes de IA** (Farmer.Chat, Bayer E.L.Y.): la tendencia es *explicar*, no solo mapear. Nuestro formato de "por
  qué / evidencia / vacíos / riesgos" va en esa dirección.
- **Modelos de cultivo en línea** (ARMonline, Yield Prophet): hay demanda de escenarios, con participación del usuario (12
  talleres con 65 interesados en RotationARM).
- **Servicios climáticos para decidir con incertidumbre** (CIAT, TAMSAT-ALERT): una probabilidad vale más que una fecha.

## 6. Qué significa para DataCorn

**Posicionamiento (propuesto, para decidir):**

> "ZARC, KATAM y Google te dicen *cuándo sembrar*. KanSched e Irré-LIS, *cuándo regar*. CWA y RotationARM ayudan a elegir
> *qué cultivo conviene*. Field Shift muestra, para un campo de maíz, cómo se comportan 4 rotaciones en años secos, normales y
> húmedos —ventana de siembra, días de estrés en floración y agua de riego— con datos NASA abiertos, sin cuenta."

**Cambios aplicados el 2026-11-14 (con la aprobación de Richard):**

1. Diapositiva "Lo que ya existe" con ZARC, RotationARM, CWA y NavePlant. El criterio de Innovación premia conocer el estado
   del arte, y un juez no nos puede sorprender con "ya existe".
2. No decir "primeros"; decir "no encontramos una herramienta pública que…" y nombrar la búsqueda.
3. Cada ficha declara en "vacíos" lo que no modelamos: N, residuos y efectos de la rotación en el rendimiento. El agua del
   suelo sí se arrastra entre cultivos (Tarea 9).
4. Presentar el riesgo por ventana como ZARC (riesgo % por decendio) en vez de una fecha única. Es la forma más probada de
   comunicar ventanas. **Queda como Could**: pide `planting.windows[]` (contrato v0.3.0, primero el contrato).
5. Diapositiva de escala: método global (POWER, FAO-56) + suelo intercambiable (SSURGO → SoilGrids). Marcar como diseño, no
   como prueba.

Aplicados en: plan MVP (restricciones, foco de revisión 7, Tareas 7, 9 y 13), plan del equipo (§5, §6, §7), la página del
plan, `docs/planning/PROBLEM.md` (§7, §8), `docs/planning/MVP.md` (§2.3) y `docs/submission/SUBMISSION-COMPLIANCE.md` (fila
Creativity). No se tocó el contrato, `REQUIREMENTS.md` ni los issues de GitHub.

**Preguntas nuevas al mentor** (ya son las preguntas 11 y 12 del plan del equipo):

1. ¿Conoce el Crop Water Allocator de K-State? ¿Lo usan los productores del oeste de Kansas? ¿Nos recomendaría usar sus
   funciones de rendimiento como referencia?
2. ¿Hay un extensionista que nos diga qué comparación de rotaciones sí hacen hoy los consultores locales?

**Riesgos:**

| Riesgo | Mitigación |
|---|---|
| Un jurado nombra CWA o RotationARM | Diapositiva de diferenciación y cita en la ficha |
| Cobertura de los datos NASA es gruesa (POWER ~0,5°, GRACE cientos de km) | Declararlo; usar GRACE solo como contexto |
| Usuario: en África y LatAm los usuarios no tienen este perfil | Dejar claro que el piloto es un productor grande de EE. UU. |
| Evidencia **B** (resúmenes de búsqueda) | Antes del pitch, abrir y leer CWA, ZARC y KATAM |

## 7. Pendiente de verificar

1. Acceso, precio y alcance actuales de **CWA** (`mycwa.engg.ksu.edu`) y de **ARMonline**.
2. Si **Fruchtfolge** o **CWA** modelan agua por etapa; no lo pude leer.
3. Regla de ZARC (clases de riesgo, vínculo con seguro/Proagro); una fuente la dio como obligatoria para seguro subsidiado.
4. Estado de **Strider** (¿Syngenta?), **Regrow**, **BharatAgri**, **Terion**.
5. Estado final de BCAM 7 en la UE.
6. Cobertura actual de CIAT/Aclimate en Colombia y de los servicios de África (Tomorrow Now, Ghana).
7. Chile, Asia y Oceanía en idioma local: no se buscó.

## 8. Fuentes

**Gemelos y planificadores de rotación**
- UniSQ, CropARM (leído): https://www.unisq.edu.au/research/sqnnsw-hub/blogs/croparm26
- RotationARM (Computers and Electronics in Agriculture, 2026): https://era.dpi.qld.gov.au/id/eprint/15651/1/1-s2.0-S0168169926003200-main.pdf
- RotationARM (MODSIM 2025): https://mssanz.org.au/modsim2025/files/B04.grewer.pdf
- Crop Water Allocator (K-State eUpdate): https://eupdate.agronomy.ksu.edu/article/crop-water-allocator-designed-to-help-farmers-with-limited-water-519-2
- Crop Water Allocator (K-State, 2022): https://www.ksre.k-state.edu/news/stories/2022/11/agriculture-crop-water-allocation.html
- Fruchtfolge (documento de trabajo): https://ageconsearch.umn.edu/record/305287/files/Dispap_20_6.pdf
- Fruchtfolge (código): https://github.com/fruchtfolge/client
- Cashcropper (Ontario): https://www.topcropmanager.com/cashcropper-app-for-ont-crop-rotations-16374/
- Granular ROI: https://www.agrinews-pubs.com/business/2020/12/22/free-roi-tool-helps-farmers-make-planting-decisions/
- Herramienta finlandesa: https://agris.fao.org/search/ru/records/65df911763b8185d9cad4a1f
- Rotación (FWI/Omnia): https://www.fwi.co.uk/arable/crop-selection/rotations/how-farmers-can-benefit-from-new-rotation-planning-tool
- NavePlant (Meteomatics): https://www.meteomatics.com/en/customer-stories/nave-analytics-irrigation-and-planting/
- Sentinel Ag + Nave: https://www.fertilizerdaily.com/20251217-sentinel-ag-and-nave-analytics-to-integrate-irrigation-and-nitrogen-intelligence/
- Yield Prophet (CSIRO): https://www.csiro.au/en/research/plants/crops/grains/yield-prophet
- Yield Prophet (BCG): https://www.bcg.org.au/make-better-decisions-with-yield-prophet/

**EE. UU. (riego)**
- KanSched 2: https://bookstore.ksre.ksu.edu/download/kansched2-an-et-based-irrigation-scheduling-tool_EP129
- Herramientas de riego del proyecto Ogallala: https://www.depts.ttu.edu/tawc/resources/researchuploads/irrrigationschedulingtools.pdf
- Proyecto Ogallala (drought.gov): https://www.drought.gov/regional-activities/ogallala-aquifer-interdisciplinary-research

**Latinoamérica**
- ZARC (Revista Cultivar): https://revistacultivar.com.br/noticias/milho-segunda-safra-e-consorcio-com-braquiaria-tem-novos-zoneamentos-de-risco-climatico
- ZARC (folleto Embrapa 2021): https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1132134/1/Folder-Zarc-2021.pdf
- SENAMHI, boletín de maíz: https://cdn.www.gob.pe/uploads/document/file/8039978/6751068-riesgo_agroclimatico_maiz_may25.pdf
- SENAMHI, Mesa Técnica San Martín: https://www.gob.pe/institucion/senamhi/noticias/1386681-informacion-agroclimatica-para-fortalecer-la-capacidad-adaptativa-de-los-productores-agropecuarios-mesa-tecnica-agroclimatica-san-martin
- SIAP, aptitud agroclimática (frijol): https://www.gob.mx/cms/uploads/attachment/file/495087/Reporte_de_Aptitud_agroclim_tica_de_M_xico_del_frijol_OI_2019-2020.pdf
- INTA SEPA: https://repositorio.inta.gob.ar/xmlui/handle/20.500.12123/15037
- CIAT, servicios climáticos: https://alliancebioversityciat.org/stories/climate-services-smarter-farming
- CIAT, pronósticos y maíz: https://alliancebioversityciat.org/publications-data/applying-agroclimatic-seasonal-forecasts-improve-rainfed-maize-agronomic
- Agrosmart: https://globalventuring.com/corporate/industrial/agrosmart-digital-farming
- Climatempo Agroclima PRO: https://www.climatempoconsultoria.com.br/?p=550

**Europa**
- Irré-LIS (Arvalis): https://hal.inrae.fr/hal-03405344/document
- Irré-LIS en maíz semilla: https://www.terre-net.fr/2016/article/118905/l-outil-irre-lis-disponible-sur-mais-semence-en-2016
- MAGDA (FutureWater): https://www.futurewater.eu/projects/magda/
- ClimField (ESA): https://www.esa.int/ESA_Multimedia/Images/2022/06/Enabling_Polish_farmers_to_irrigate_efficiently
- SeBS Austria: https://earsc.org/sebs/wp-content/uploads/2024/01/SeBS_irrigation_water_in_Austria_broch_final.pdf
- BCAM 7 (Irish Examiner): https://www.irishexaminer.com/farming/arid-41741274.html
- BCAM 7 (Parlamento Europeo): https://www.europarl.europa.eu/news/en/press-room/20250922IPR30511/first-vote-on-simplification-of-eu-agriculture-laws

**Asia**
- Google, monzón en la India: https://blog.google/technology/research/indian-farmers-monsoon-prediction/
- U. de Chicago, pronósticos centrados en las personas: https://humancenteredforecasts.climate.uchicago.edu/news/ai-based-monsoon-forecasts-help-38-million-indian-farmers-make-planting-decisions/
- IMD, cierre de unidades agromet: https://www.downtoearth.org.in/agriculture/come-march-and-199-district-agromet-units-will-wind-up-as-per-centre-s-order-94175
- IMD, posible reactivación: https://www.tribuneindia.com/news/india/shut-down-in-2024-centre-mulls-reviving-weather-advisory-units-for-farmers
- KATAM Terpadu (revisión): https://karya.brin.go.id/id/eprint/58458/
- KATAM Terpadu (artículo): https://epublikasi.pertanian.go.id/berkala/jsl/article/download/3312/3351
- CropWatch Cloud (ONU, 2025): https://ggim.un.org/meetings/2025/UN_GeoNow/documents/23Oct_am_Bingfang_Wu.pdf
- LG CNS: https://www.fertilizerdaily.com/20240614-lg-cns-deploys-satellite-technology-for-ai-driven-smart-farming

**Oceanía**
- CSIRO WaterWise: https://www.csiro.au/en/research/natural-environment/water/waterwise
- NIWA Irrigation Insight: https://niwa.co.nz/news/irrigation-insight
- SWAN Systems: https://afdj.com.au/?p=5670

**África**
- TAMSAT-ALERT (Frontiers in Climate): https://doaj.org/article/52841b6535604e6facd6ab76181de550
- Planting date (Frontiers in Climate): https://www.frontiersin.org/articles/10.3389/fclim.2022.993511
- Calendario de Ghana: https://alliancebioversityciat.org/stories/farming-sync-seasons-ghana-cropping-calendar-revolution
- Kenia, servicio de ventana de siembra: https://www.developmentaid.org/news-stream/post/203491/the-ai-revolution-boosting-african-farmers-harvests-tomorrow-now-ceo-on-climate-resilience-and-the-power-of-partnerships-exclusive-interview
- ClimateSERV: https://climateserv.servirglobal.net/about
- AgriSERV: https://agriserv.servirglobal.net/
- Digital Green: https://www.digitalgreen.org/about
- Farmer.Chat (arXiv): https://arxiv.org/html/2603.03294v1
- GSMA/MicroSave: https://www.microsave.net/wp-content/uploads/2026/04/260331-Resilient-farming-in-the-digital-age_1.pdf
- Gro Intelligence (Techpoint): https://techpoint.africa/news/kenya-gro-intelligence-shuts-down/
- Fracasos agtech en África: https://launchbaseafrica.com/2024/09/05/tracking-startup-failures-in-africa-from-millions-in-funding-to-silent-shutdowns/

**Global y fracasos**
- FAO CROPWAT: https://www.fao.org/land-water/databases-and-software/cropwat
- AgTechNavigator, fracasos 2025: https://www.agtechnavigator.com/Article/2026/01/28/why-agtech-start-ups-failed-last-year-and-a-playbook-for-2026
- AgTechNavigator, "tech en busca de problema": https://www.agtechnavigator.com/Article/2025/07/15/sector-crises-illustrate-curse-of-tech-looking-for-the-problem
- UNL, cierres de 2025: https://digitalcommons.unl.edu/biosysengpres/83
- ClimateAi: https://agfundernews.com/climate-resilience-platform-climateai-winds-down-operations
- Mineral (Alphabet): https://agfundernews.com/mineral-winds-down-we-will-no-longer-be-an-alphabet-company-but-our-technology-will-live-on
- FarmWise: https://www.fertilizerdaily.com/20250403-farmwise-to-close-operations-exploring-sale-of-its-ai-weeding-technology/
- BharatAgri (título): https://www.peoplematters.in/news/business/bharatagri-shuts-shop-after-failing-to-secure-new-funding-round-47212
- Indigo Ag: https://agfundernews.com/indigo-ag-cuts-80-jobs-across-us-signs-new-carbon-credits-buyers
- Adopción de herramientas de decisión (2024): https://pmc.ncbi.nlm.nih.gov/articles/PMC11754955
