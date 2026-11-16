# Data Corn — Requerimientos

Prioridad:
- **Debe**: entra en la entrega del 15 de noviembre de 2026.
- **Debería**: entra si alcanza el tiempo.
- **Puede**: es un extra.
- **Después**: es para la expansión a otros países.

## Requerimientos funcionales

### A. Lote y entradas

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-01 | Dibujar el lote tocando el mapa satelital para marcar cada esquina. Se puede deshacer el último punto, cerrar tocando el primer punto o con «Cerrar lote», y mover un punto arrastrándolo. El área se muestra en vivo. | Debe |
| RF-02 | Botón «Mi ubicación» que centra el mapa en la ubicación del dispositivo, con permiso del navegador. | Debe |
| RF-03 | Elegir un lote de ejemplo ya calculado: Nebraska con riego, Nebraska de secano, Iowa, Illinois y Kansas. | Debe |
| RF-04 | Validar el contorno: área entre 1 y 2 000 ha (unos 5 000 acres), sin cruces entre sus lados, hasta 500 vértices y dentro de una región con perfil de datos. | Debe |
| RF-05 | Al cerrar el lote, calcular todo solo a partir del contorno: región, condado, área, suelo (textura, agua disponible, drenaje), pendiente, zonas bajas, cultivo de cada año, rendimiento promedio del condado y fase actual de El Niño. En el mismo momento se descargan el clima histórico y los datos satelitales, y la pantalla muestra el avance paso a paso. | Debe |
| RF-06 | Después del cálculo, un formulario de 7 datos con valores por defecto: contorno; fecha de siembra (por defecto la habitual del estado); madurez del híbrido de 80 a 120 días (por defecto según la latitud); riego (no, pivote, surco o goteo). Opcionales: capacidad del riego, labranza (convencional, mínima o siembra directa) y rendimiento esperado (por defecto el promedio del condado). | Debe |
| RF-07 | Dejar que el usuario corrija lo detectado, por ejemplo el cultivo anterior. | Debería |
| RF-08 | Buscar un lugar por nombre o coordenadas. Sirve también si el usuario no da permiso de ubicación. | Debería |
| RF-09 | La primera pantalla es un globo terráqueo en 3D. «Ir a mi ubicación», la búsqueda y los lotes de ejemplo llevan hasta el lugar con un vuelo animado de unos 4 s (globo → continente → campo). | Debe |

### B. Indicadores

Todos los indicadores se calculan siempre.
- **En pantalla:** cada uno aparece como tarjeta clave (semáforo, número grande y una frase) o dentro del veredicto.
- **En el PDF:** el detalle completo de cada uno: gráfico, método, evidencia, confianza y qué revisar en campo.

| ID | Indicador | Cálculo | Datos (EE. UU.) | Se ve en | Prioridad |
|---|---|---|---|---|---|
| RF-10 | Ventana de siembra | Rango de fechas con humedad suficiente en el suelo y sin helada; compara la fecha elegida | SMAP, NLDAS, PRISM, POWER | Tarjeta 1 (antes de sembrar) · PDF | Debe |
| RF-11 | Ajuste del híbrido | Grados-día (base 10 °C / 50 °F) disponibles frente a los que pide esa madurez; probabilidad de madurar antes de la primera helada | PRISM, POWER | Tarjeta 4 · PDF | Debe |
| RF-12 | Agua en floración | Balance de agua diario FAO-56 del lote; días con estrés en la floración (±2 semanas); pérdida relativa con el factor Ky | POWER (ET0), PRISM, IMERG, SSURGO; SMAP para validar | Tarjeta 2 · PDF | Debe |
| RF-13 | Calor en floración | Días con máxima > 35 °C (95 °F) en la floración; partes más calientes del lote | PRISM, POWER, ECOSTRESS | Tarjeta 3 · PDF | Debe |
| RF-14 | Helada | Probabilidad de helada tardía después de la siembra y temprana antes de la madurez | PRISM, POWER, NASADEM | Tarjeta 4 · PDF | Debe |
| RF-15 | Riego (solo con riego) | Lámina semanal recomendada; si la capacidad del equipo alcanza en el pico de consumo | POWER, ECOSTRESS; OpenET para validar | Tarjeta 5 (con riego) · PDF | Debe |
| RF-16 | Avance de la campaña | NDVI del lote frente a su propia historia: adelantado, normal, atrasado o con estrés | HLS, Sentinel-2, MODIS | Tarjeta 1 (durante la campaña) · PDF | Debe |
| RF-17 | Encharcamiento | Riesgo por suelo saturado, lluvias extremas, drenaje y zonas bajas | SMAP, IMERG, SSURGO, NASADEM | Tarjeta 5 (secano) · PDF | Debería |
| RF-18 | Zonas del lote | Zonas estables (alta, media, baja) con el NDVI de varias campañas y el relieve | Sentinel-2, HLS, NASADEM | Capa del mapa · PDF | Debería |
| RF-19 | El Niño / La Niña | Fase actual y pronóstico; cómo le fue a este lote en cada fase (agua, calor, rendimiento relativo). Si la relación es débil, lo dice. | ONI y pronóstico de NOAA CPC, más la historia del lote | Veredicto · PDF | Debe |
| RF-20 | Rotación | Compara maíz tras maíz con maíz tras soya en este lote: agua al sembrar, residuos y erosión, historial real del lote y diferencia de rendimiento en el condado | CDL, NASS, gemelo de agua, NASADEM, IMERG | Tarjeta 6 · PDF | Debe |
| RF-21 | Rendimiento relativo | Índice esperado frente al promedio del condado en cada escenario. No da t/ha exactas. | NASS y resultados del gemelo | PDF | Debería |

### C. Resultados en pantalla

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-30 | Veredicto de la campaña, lo primero que se ve: semáforo, una frase de recomendación, y la fase de El Niño con la fuerza de su efecto en este lote. | Debe |
| RF-31 | Película de la campaña: una línea de tiempo sobre el mapa con las etapas en íconos (siembra, vegetativo, floración, llenado, cosecha), los tramos de riesgo en color, un cursor que se arrastra y un botón ▶. Al reproducirla, el mapa avanza día a día: cambia la capa de sequía de la zona, el lote se pinta según su agua en el suelo y un medidor muestra ese valor. Se puede ver el año típico, los años El Niño o un año concreto. Con la campaña en curso, separa lo observado de lo que falta con una marca de "hoy". | Debe |
| RF-32 | Seis tarjetas clave grandes. Cada una lleva ícono, título, semáforo, número grande y una frase; no hay gráficos ni detalle técnico en pantalla. Son: siembra o avance, agua, calor, híbrido y helada, riego o encharcamiento, y rotación. | Debe |
| RF-33 | «Cambiar datos» recalcula al instante, sin volver a descargar los datos. | Debe |
| RF-34 | Mostrar las fuentes en una línea en pantalla y con la cita completa en el PDF. | Debe |
| RF-35 | Mostrar siempre el aviso de que la herramienta apoya al productor y al agrónomo, y no los reemplaza. | Debe |
| RF-36 | Elegir la campaña: la próxima (planificación) o la actual o anterior (seguimiento y repaso). | Debe |
| RF-37 | Mostrar, desde resultados, «Nuevo lote» para dibujar otro sin recargar la página. | Debe |
| RF-38 | Franjas de 25 campañas: una franja por año, coloreada según lo que pasó en la floración de este lote, con una marca en los años El Niño o La Niña. Al tocar un año se reproduce su película. | Debe |

### F. Capas de clima sobre el mapa

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-60 | Capas que se pueden activar sobre el globo y sobre el lote, cada una con su leyenda en palabras. Son: sequía (anomalía de humedad del suelo frente a lo normal), lluvia, calor de superficie y vegetación (NDVI). En resultados se suma la capa de zonas del lote. | Debe |
| RF-61 | Deslizador de tiempo con ▶ para animar las capas mes a mes en el globo y día a día en la película. | Debe |
| RF-62 | Antes de ubicarse, poder explorar en el globo cómo se comporta el clima en el mundo: las mismas capas, a escala mundial. | Debe |

### D. Idioma, unidades y compartir

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-40 | Cambiar entre español e inglés. | Debe |
| RF-41 | Cambiar entre unidades imperiales (acres, bu/ac, in, °F) y métricas (ha, t/ha, mm, °C). | Debe |
| RF-42 | Compartir un enlace que lleva el contorno y los datos en la URL, sin cuentas. | Debería |
| RF-43 | Descargar el reporte completo en PDF, en el mismo idioma y las mismas unidades. Lleva un resumen con la imagen del lote, los 9 indicadores en detalle con gráfico, El Niño por fase, la rotación con el historial del lote, las zonas, las fuentes con su cita y el aviso (docs/app/flujo-y-pantalla.md, sección «Reporte completo (PDF)»). | Debe |

### E. Regiones

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-50 | Tener un perfil de datos por región: qué fuente usa cada variable y cuál es su respaldo global. | Debe (EE. UU.) |
| RF-51 | Fuera de una región con perfil, usar fuentes globales (POWER, IMERG, SMAP, HLS, NASADEM, SoilGrids) y bajar la confianza. | Debería |
| RF-52 | Tener perfiles para Perú, Brasil y Argentina, con su índice local de El Niño (ICEN en la costa del Perú) y sus estadísticas (MIDAGRI, CONAB/IBGE, MAGyP). | Después |

## Requerimientos no funcionales

| ID | Tipo | Requerimiento |
|---|---|---|
| RNF-01 | Rendimiento | Al cerrar el lote, el cálculo y la descarga de datos tardan 60 s o menos (p95). Los resultados después del formulario salen en 2 s o menos. Un lote de ejemplo sale en 3 s o menos. El PDF se genera en 10 s o menos. La web carga en 3 s o menos con 4G. |
| RNF-02 | Escalabilidad por región | Sumar un país se hace con un archivo de perfil y, si hace falta, nuevos adaptadores de datos. No se toca el dominio ni la pantalla. |
| RNF-03 | Escalabilidad de carga | Cloud Run escala solo, de 0 a N instancias. Los resultados quedan en caché por contorno y datos de entrada. |
| RNF-04 | Disponibilidad | Los lotes de ejemplo funcionan aunque falle Earth Engine, porque están precalculados. |
| RNF-05 | Costo | Todo cabe en el crédito de $300 de Google Cloud. Cloud Run arranca en 0 instancias y hay una alerta de presupuesto. |
| RNF-06 | Privacidad | Sin login ni datos personales. El contorno solo se guarda en una caché anónima. Sin cookies de seguimiento. |
| RNF-07 | Seguridad | Las claves van en Secret Manager. La cuenta de servicio tiene permisos mínimos. Se validan las entradas (área, vértices), hay un límite de solicitudes por IP y CORS solo acepta el dominio propio. |
| RNF-08 | Transparencia científica | Cada número indica su fuente, su período y su confianza. Los parámetros del cultivo (Kc, Ky, umbrales) están en archivos de configuración con su referencia (FAO-56, FAO-33). |
| RNF-09 | Usabilidad | Mapa primero y un paso a la vez. En pantalla solo lo importante, con lenguaje simple; lo técnico va en el PDF. El semáforo nunca depende solo del color: siempre lleva ícono y texto. |
| RNF-10 | Accesibilidad | Contraste WCAG 2.2 AA, botones táctiles de al menos 44 px, formulario usable con teclado y texto alternativo en los gráficos del PDF. |
| RNF-11 | Responsive | Diseñada primero para celular, desde 360 px de ancho. En escritorio, los paneles van al costado del mapa. |
| RNF-12 | Internacionalización | Todos los textos están en archivos de idioma. Fechas y números se muestran según el idioma. Internamente todo se calcula en unidades métricas y solo se convierte al mostrarlo. |
| RNF-13 | Mantenibilidad | Clean architecture: el dominio no depende de librerías de datos ni de la web. Hay pruebas unitarias del dominio, por ejemplo FAO-56 contra los ejemplos del manual. |
| RNF-14 | Observabilidad | Logs estructurados en Cloud Logging, con el tiempo que tarda cada proveedor de datos. |
| RNF-15 | Reglas de Space Apps | Código abierto con licencia Apache-2.0. Todo lo entregado va en inglés. Se cita cada recurso y se declara el uso de IA. |
| RNF-16 | Portabilidad | La API corre en un contenedor Docker y la web es estática. |
| RNF-17 | Animación | El vuelo y la película se ven fluidos (meta: 60 cuadros por segundo en un celular de gama media). Las capas aparecen en 2 s o menos. Se respeta «reducir movimiento» del sistema: el mapa salta sin animación y la película avanza por pasos. |

## Orden de construcción

| Paso | Qué se construye | Requerimientos |
|---|---|---|
| F0 | Base: repositorio, API con /health, web con el globo, despliegue | RNF-15, RNF-16 |
| F1 | Lote: mi ubicación con vuelo, dibujar con puntos, validar y detectar región, área y condado | RF-01, RF-02, RF-04, RF-08, RF-09, RF-50 |
| F2 | Datos del lote: suelo, relieve y cultivos por año | RF-05 |
| F3 | Clima histórico y fenología por grados-día | RF-11, RF-14, RF-31 |
| F4 | Gemelo de agua FAO-56 y validación con SMAP | RF-10, RF-12, RF-15 |
| F5 | Calor, avance de la campaña con NDVI, encharcamiento y capas de clima en el mapa | RF-13, RF-16, RF-17, RF-60 a RF-62 |
| F6 | El Niño / La Niña y escenarios por fase | RF-19 |
| F7 | Rotación y rendimiento relativo | RF-20, RF-21 |
| F8 | Pantalla por pasos: película de la campaña, veredicto, franjas de 25 campañas, tarjetas clave, idioma, unidades y PDF | RF-30 a RF-38, RF-40, RF-41, RF-43, RNF-17 |
| F9 | Lotes de ejemplo precalculados y entrega | RF-03, RNF-04 |
