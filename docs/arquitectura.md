# Data Corn — Arquitectura

## 1. Vista general

```mermaid
flowchart LR
    U[Navegador<br/>Astro + React · globo MapLibre · PDF] -->|HTML/JS estático| FH[Firebase Hosting]
    U -->|/api/**| FH
    U -->|teselas de capas, sin clave| GIBS[NASA GIBS<br/>Blue Marble · SMAP L4 · IMERG · MODIS LST · NDVI]
    FH -->|rewrite| CR[Cloud Run<br/>API FastAPI · Python]
    CR --> EE[Google Earth Engine<br/>HLS · Sentinel-2 · MODIS · IMERG · SMAP<br/>NASADEM · CDL · PRISM · NLDAS · OpenET · ECOSTRESS]
    CR --> PW[NASA POWER API]
    CR --> SD[USDA Soil Data Access<br/>SSURGO]
    CR --> NS[USDA NASS QuickStats]
    CR --> NO[NOAA CPC<br/>ONI y pronóstico ENSO]
    CR --> GCS[(Cloud Storage<br/>caché y lotes de ejemplo)]
    CR --> SM[Secret Manager]
```

- **Web:** Astro genera un sitio estático. Las partes interactivas (mapa, formulario, tarjetas) son una isla de React.
- **API:** FastAPI en Cloud Run, región `us-central1`. Arranca en 0 instancias y escala sola.
- **Mismo dominio:** Firebase Hosting reenvía `/api/**` a Cloud Run, así que no hace falta CORS en producción.

## 2. Clean architecture del backend

```mermaid
flowchart TB
    subgraph interfaces [interfaces · HTTP]
        R[routers FastAPI] --> S[schemas Pydantic]
    end
    subgraph application [application · casos de uso]
        UC[DescribeField · AnalyzeField · ListDemoFields]
        P[ports: interfaces de datos]
    end
    subgraph domain [domain · reglas del cultivo]
        M[modelos] --> AG[agronomía: ET0, agua, grados-día, riesgos, ENSO, rotación, confianza]
    end
    subgraph infrastructure [infrastructure · adaptadores]
        AD[Earth Engine · POWER · SSURGO · NASS · NOAA · SoilGrids · caché]
        RG[registro de regiones · perfiles YAML]
    end
    R --> UC
    UC --> AG
    UC --> P
    AD -. implementa .-> P
    RG -. elige adaptadores .-> P
    B[bootstrap: arma todo] --> R
    B --> AD
```

**Regla de dependencias:** las flechas solo apuntan hacia adentro.
- `domain` no importa nada del proyecto ni de librerías externas de datos.
- `application` solo importa `domain`.
- `infrastructure` implementa los puertos de `application`.
- `interfaces` usa los casos de uso.
- `bootstrap.py` es el único lugar donde se conectan las capas.

| Capa | Carpeta | Qué contiene |
|---|---|---|
| Dominio | `apps/api/src/datacorn/domain/` | Modelos (lote, suelo, clima, etapas, reporte) y cálculos puros: FAO-56, balance de agua, grados-día, calor, helada, riego, NDVI, ENSO, rotación, zonas, confianza |
| Aplicación | `apps/api/src/datacorn/application/` | Puertos (interfaces) y casos de uso |
| Infraestructura | `apps/api/src/datacorn/infrastructure/` | Adaptadores de cada fuente de datos, caché, registro de regiones |
| Interfaces | `apps/api/src/datacorn/interfaces/http/` | API REST, validación y serialización |
| Recursos | `apps/api/src/datacorn/resources/` | Perfiles de región y parámetros de cultivos en YAML |

## 3. Escalar a otros países: perfiles de región

Cada región es un archivo YAML. Para cada variable, el archivo indica qué fuente usar y en qué orden probar los respaldos. Sumar Perú, Brasil o Argentina consiste en escribir su perfil y, si una fuente es nueva, su adaptador. El dominio y la pantalla no cambian.

| Puerto | EE. UU. (activo) | Respaldo global | Perú / Brasil / Argentina (después) |
|---|---|---|---|
| `ClimatePort` | PRISM + POWER | POWER, ERA5-Land, IMERG | POWER, ERA5-Land, IMERG |
| `SoilPort` | SSURGO | SoilGrids | SoilGrids |
| `ElevationPort` | NASADEM | NASADEM | NASADEM |
| `CropHistoryPort` | CDL | — | MapBiomas (por evaluar) |
| `VegetationPort` | HLS, Sentinel-2, MODIS | igual | igual |
| `SoilMoisturePort` | SMAP L4, NLDAS | SMAP L4 | SMAP L4 |
| `EvapotranspirationPort` | OpenET (oeste), ECOSTRESS | ECOSTRESS | ECOSTRESS |
| `EnsoPort` | ONI | ONI | ICEN + ONI (Perú) · ONI |
| `YieldStatsPort` | NASS | — | MIDAGRI · CONAB/IBGE · MAGyP |
| `GroundwaterPort` (después, aún sin código) | NWIS | GRACE | GRACE |

El indicador de El Niño se calcula igual en todas las regiones, agrupando la historia del lote por fase. Si en un lugar la relación es débil, como en el Corn Belt, el sistema lo informa. Donde es fuerte, como en la costa del Perú, se ve en los datos. El sistema no supone el efecto: lo mide.

## 4. Contrato de la API

| Método y ruta | Entrada | Salida |
|---|---|---|
| `GET /api/v1/health` | — | Estado del servicio |
| `GET /api/v1/regions` | — | Regiones con su estado (activa o planificada) y sus fuentes |
| `GET /api/v1/demo-fields` | — | Lotes de ejemplo |
| `GET /api/v1/layers` | — | Catálogo de capas: id, fuente (GIBS o Earth Engine), leyenda y rango de fechas |
| `GET /api/v1/layers/drought/tiles?date=AAAA-MM` | Mes | Plantilla de teselas de Earth Engine con la anomalía de humedad SMAP L4 de ese mes (en caché por unas horas) |
| `POST /api/v1/fields/describe` | Contorno GeoJSON | Contexto del lote (región, condado, área, suelo, relieve, cultivos por año, rendimiento del condado, ENSO actual) y valores por defecto. En la misma llamada descarga el clima y los datos satelitales del lote y los deja en caché. |
| `POST /api/v1/fields/analyze` | Contorno, campaña y los datos del formulario | Reporte: veredicto, película de la campaña (serie diaria del año típico, de los años El Niño y de cada año), franjas por año, indicadores, rotación, ENSO, zonas, confianza y fuentes. Usa los datos en caché, así que es inmediato. |

El PDF no pasa por la API: la web lo arma con el mismo reporte.

- **Unidades:** toda la API trabaja en unidades métricas. La web convierte a imperiales solo al mostrar.
- **Textos:** la API no devuelve frases armadas. Devuelve claves de texto con sus valores (por ejemplo `flowering_water.high` con `{years: 9, total: 20}`), y la web las traduce con `es.json` o `en.json`. Así el mismo reporte sirve para los dos idiomas.
- **Pendientes:** mientras una función no esté construida, su ruta responde `501` con el paso que falta (por ejemplo `F4`).

## 5. Estructura de carpetas

```
Nasa/                               raíz del repositorio
├─ README.md · LICENSE · .gitignore · .editorconfig · firebase.json
├─ docs/                            reto, guías, flujo, pantalla, requerimientos, arquitectura
├─ apps/
│  ├─ api/                          backend Python (Cloud Run)
│  │  ├─ pyproject.toml · Dockerfile · .env.example
│  │  ├─ src/datacorn/
│  │  │  ├─ domain/                 models.py · report.py · crops.py · agronomy/*
│  │  │  ├─ application/            ports.py · dto.py · use_cases/*
│  │  │  ├─ infrastructure/         providers.py · earthengine/* (incluye SoilGrids) · power.py · ssurgo.py · nass.py · ecostress.py · enso/ · cache/ · regions/
│  │  │  ├─ interfaces/http/        app.py · routes/* · schemas.py
│  │  │  ├─ resources/              regions/*.yaml · crops/*.yaml
│  │  │  ├─ bootstrap.py · config.py · main.py
│  │  └─ tests/                     unit/ · integration/
│  └─ web/                          frontend Astro + React
│     ├─ package.json · astro.config.mjs · tsconfig.json
│     └─ src/
│        ├─ pages/ · layouts/       index.astro (pantalla única)
│        ├─ app/                    DataCornApp.tsx (isla principal)
│        ├─ domain/                 tipos del reporte · conversión de unidades
│        ├─ application/            estado y casos de uso de la web
│        ├─ infrastructure/         cliente de la API · configuración del mapa
│        ├─ ui/                     map (globo, vuelo, dibujo, capas) · steps · film · stripes · cards · pdf · common
│        ├─ i18n/                   es.json · en.json
│        └─ styles/
└─ infra/                           despliegue: Cloud Run, Firebase, presupuesto
```

## 6. Decisiones técnicas

| Tema | Decisión | Motivo |
|---|---|---|
| Backend | Python 3.12 + FastAPI 0.163 | La API de Earth Engine para Python es la más completa, y numpy y scipy cubren FAO-56 y el suavizado del NDVI |
| Frontend | Astro 7.4 + React 19 + TypeScript 6 | Astro lo eligió el equipo. React tiene más ejemplos de mapas y dibujo. TypeScript 6 porque `@astrojs/check` aún no admite TypeScript 7 |
| Requisito de Node | 22.23.4 o superior | Lo exige Astro 7.4 |
| Mapa | MapLibre GL 6 con proyección de globo, `flyTo` para el vuelo, y Terra Draw para dibujar con puntos | Libres y sin clave; el globo 3D viene incluido |
| Fondo del mapa | Blue Marble de NASA GIBS en el globo; Sentinel-2 cloudless de EOX al acercarse | No piden clave. Se puede cambiar a Google Map Tiles por configuración |
| Capas de clima | Desde NASA GIBS, directo del navegador: `SMAP_L4_Analyzed_Root_Zone_Soil_Moisture`, `IMERG_Precipitation_Rate`, `MODIS_Terra_L3_Land_Surface_Temp_Daily_Day`, `MODIS_Terra_L3_NDVI_Monthly`. La sequía (anomalía) se calcula en Earth Engine | GIBS es de la NASA, gratis y con dimensión de tiempo. La anomalía necesita comparar con la normal, por eso va en Earth Engine |
| PDF | `@react-pdf/renderer` 4.9, en el navegador | Reutiliza los textos (es/en), las unidades y el reporte ya cargado. No cuesta servidor |
| Gráficos | Recharts 3 | Se integra con React y tiene texto alternativo |
| Hosting | Firebase Hosting + Cloud Run `us-central1` | Todo dentro del crédito de Google Cloud; Earth Engine está en la misma región |
| Caché | Cloud Storage, JSON por clave (contorno + datos) | Barato y suficiente para el hackathon |
| Unidades internas | Métricas | Se convierten solo al mostrarlas |
| Licencia | Apache-2.0 | La pide Space Apps por defecto |

## 7. Accesos que faltan

| Qué | Para qué |
|---|---|
| Proyecto nuevo en Google Cloud (crédito de $300) | Cloud Run, Cloud Storage, Secret Manager |
| Registro del proyecto en Earth Engine (uso no comercial) y una cuenta de servicio | Que la API consulte Earth Engine |
| Clave de NASS QuickStats (gratis) | Rendimiento por condado y fechas de siembra |
| Proyecto de Firebase vinculado al de Google Cloud | Publicar la web |
| Repositorio en GitHub | Código abierto, enlace para la entrega |
