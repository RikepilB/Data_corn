# Field Shift — Plan de acción del equipo DataCorn

**Cierre de envíos: domingo 15 nov 2026, 23:59 hora Perú (PET, UTC−5). Meta interna: enviar a las 20:00 PET.**
Hoy sábado a las 12:00 PET quedan ~36 h. Todos los horarios de este documento están en **hora Perú**.

Borrador preparado con ayuda de SI (Claude Code) a partir de la propuesta del equipo. La idea
y las decisiones son del equipo; lo marcado **DECIDIR** se cierra en el kickoff.

> **PIVOT (sáb. tarde, tras la asesoría con el mentor).**
> - **Foco:** maíz, productores grandes y medianos de **un estado de EE. UU.**; se recomienda el oeste de Kansas.
> - **Decisiones que apoya la herramienta:** **cuándo sembrar** y **en qué etapa falta agua** (floración, VT–R1).
> - **Qué cambia en el diseño:**
>   - años **secos / normales / húmedos** en vez de El Niño / La Niña;
>   - suelo SSURGO (USDA) en vez de SoilGrids;
>   - contrato de fichas v0.2.0.
> - **El producto sigue siendo la comparación de rotaciones** (lo exige el reto). Fecha de siembra y estrés en
>   floración son columnas, porque el ganador global de 2024 ya hizo "ventanas de siembra" con SMAP + OpenET.
> - **Detalle:** [antecedentes](research/ANTECEDENTES-maiz-EEUU.es.md) · [arquitectura](architecture/ARCHITECTURE.md) (D7).
> - **Marca y historia (§7):** siguen igual, salvo que los colores El Niño / La Niña pasan a seco / húmedo.

| Documento | Para qué |
|---|---|
| [SUBMISSION-COMPLIANCE.md](submission/SUBMISSION-COMPLIANCE.md) | Reglas verificadas, campos del formulario, checklist de envío |
| [ARCHITECTURE.md](architecture/ARCHITECTURE.md) | Evaluación del stack, diseño del sistema, límites científicos |
| [Plan de implementación](superpowers/plans/2026-11-14-field-shift-mvp.md) | 14 tareas con tests, por carril |
| [REFERENCES.md](REFERENCES.md) | Fuentes y licencias (obligatorio citarlas todas) |

---

## 1. Kickoff — sábado 13:00 (30 min, Discord)

Seis decisiones, en este orden. Cada una tiene una recomendación; el equipo puede cambiarla.

| # | Decisión | Recomendación | Por qué |
|---|---|---|---|
| 1 | **Campo piloto** (estado de EE. UU.) | Oeste de Kansas, GMD4 (condado Sheridan, zona del LEMA Sheridan-6) | Escasez real (Ogallala, visible con GRACE); OpenET se usa en Kansas; evidencia local del LEMA. Iowa ya tiene FACTS y Nebraska tiene NavePlant (salido de Space Apps 2024). Confirmar con el mentor (pregunta 1) |
| 2 | **≥3 rotaciones, incluida la actual** (el reto lo exige) | Actual: maíz continuo con riego. Alternativas: maíz → soya; maíz → cobertura de centeno → soya; trigo → maíz → sorgo → barbecho en secano | Cubre fijación de N, ruptura del maíz sobre maíz, suelo cubierto en invierno y un cultivo tolerante a sequía. La rotación actual se lee de Crop Sequence Boundaries (USDA). Que la revise un mentor o extensionista |
| 3 | **Nombre y tagline** | Ver §7 (3 opciones) | Hay que tenerlo antes de diseñar la UI y el guion |
| 4 | **Formato del demo**: video ≤30 s **o** ≤7 diapositivas (solo uno) | **7 diapositivas en inglés** | Menos riesgo de producción. Un video exige subtítulos en inglés y marca de agua si usa SI |
| 5 | **Quién abre Earthdata y envía el pedido AppEEARS** | Miguel, antes de las 14:00 | La cola de AppEEARS puede tardar horas; es la ruta crítica de SMAP + NDVI |
| 6 | **Repositorio** | Repo público nuevo en GitHub, creado hoy (después de las 09:00) | Las reglas prohíben trabajo previo al evento. La investigación anterior queda fuera del repo |

---

## 2. La solución en una frase

**El calendario dice _dónde_ hay espacio para cambiar, el gemelo dice _qué pasaría_ y el tipo
de año (seco / normal / húmedo) dice _en qué años_ conviene.**

```
NDVI (MODIS) ──► calendario real + ventanas de suelo desnudo
                              │
POWER 1981–2025 + suelo SSURGO ──► GEMELO FAO-56 por rotación ──► SMAP 2015–2025 (chequeo de consistencia)
                              │
lluvia abr–sep (POWER) ──► tipo de año ──► MATRIZ rotaciones × tipo de año
                                           (estrés sin riego, estrés en floración VT–R1, riego necesario,
                                            suelo desnudo, erosión + confianza)
temperatura del suelo + heladas (POWER) ──► VENTANA DE SIEMBRA (todos los años; detalle por tipo de año)
GRACE ──► contexto regional del agua subterránea (no habla de un campo)
```

Qué ve el agricultor:
- su campo en el mapa;
- cuándo se puede sembrar maíz: primero el rango de todos los años, porque en abril no se sabe si el verano será
  seco; debajo, el detalle por tipo de año;
- una tabla con filas = rotaciones y columnas = años secos / normales / húmedos.

Cada rotación explica **por qué se sugiere, la evidencia, los beneficios, lo que no sabemos y los
riesgos que debe revisar alguien local**. Unidades de EE. UU. (pulgadas, °F, acres).

Siempre visible: *escenarios con clima histórico, no pronósticos; la herramienta apoya, no
reemplaza, el criterio del agricultor.*

---

## 3. Reparto (propuesto a partir del Kanban; confirmar en el kickoff)

| Persona | Rol | Entrega | Tareas del plan |
|---|---|---|---|
| **Richard** | Líder técnico e integración | Gemelo FAO-56, matriz, ficha final, deploy | 1, 2, 3, 6, 8, 9, 14 |
| **Hildemaro** | Clima y cultivos | Tipos de año (terciles de lluvia) y ventana de siembra; tabla de cultivos FAO-56 (maíz, soya, trigo, sorgo); contexto GRACE; **REFERENCES.md** | 5, 7, 15 |
| **Miguel** | Datos NASA y validación | Pedido AppEEARS, suelo SSURGO, chequeo SMAP, índice de erosión | 4, 10, 12 |
| **Denise** | Calendario satelital | Detección de siembra/cosecha y ventanas desnudas con NDVI; coberturas que caben | 11 |
| **Marcelo** | Web | Página de historia + herramienta (mapa, matriz, tarjetas) en Astro | 13 |
| **Camila** (dueña del equipo en Space Apps) | Historia, marca y envío | Narrativa, demo, página del proyecto, envío final (solo ella edita el formulario) | — |

Regla de trabajo: una rama por tarea (`feat/<tarea>`), PR a `main`, tests en verde antes de
fusionar. Si alguien termina, ayuda al carril **Must** más atrasado.

---

## 4. Cronograma (hora Perú)

| Cuándo | Qué | Hecho cuando |
|---|---|---|
| **Sáb 13:00–13:30** | Kickoff (§1) | 6 decisiones escritas en Discord |
| Sáb 13:30–14:30 | Cuentas (§8); repo público; pedido AppEEARS enviado | Todos clonan, `uv run pytest` y `pnpm build` pasan |
| Sáb 14:30–17:00 | Carriles en paralelo | — |
| **Sáb 17:00 (15 min)** | Checkpoint 1 | POWER + ET0 + tipos de año listos; web con la ficha de ejemplo v0.2.0 **publicada** en Firebase |
| Sáb 17:00–21:00 | Gemelo + matriz; guion y marca v1 | — |
| **Sáb 21:00 (15 min)** | Checkpoint 2 | Primera ficha **real** del sitio piloto con 3 rotaciones |
| Sáb 21:00–00:00 | Integración y deploy v1; luego descanso por turnos | Web v1 con datos reales en línea |
| **Dom 09:00 (15 min)** | Checkpoint 3 + autoevaluación con la rúbrica | Se decide qué "Should" entra |
| Dom 09:00–14:00 | SMAP, NDVI, erosión; pulido de UI; borrador de la página del proyecto | — |
| **Dom 14:00** | **CONGELAMIENTO** de funciones | Solo arreglos después de esto |
| Dom 14:00–16:30 | Demo (diapositivas o video), capturas, referencias, SI | Demo en enlace público |
| **Dom 16:30–17:30** | Revisión final (la reunión de domingo del equipo) | Checklist de [compliance](submission/SUBMISSION-COMPLIANCE.md) §6 |
| Dom 17:30–19:30 | Camila llena el formulario en inglés; pruebas en ventana privada | Save Progress + recarga OK |
| **Dom 20:00** | **SUBMIT FOR JUDGING** | Banner de confirmación |
| Dom 20:00–23:59 | Reserva; reenviar solo si algo se rompió | — |

---

## 5. Cortes de alcance

| Nivel | Incluye | Si falta tiempo |
|---|---|---|
| **Must** | 1 campo en Kansas, ≥3 rotaciones, POWER 1981–2025 + suelo SSURGO → gemelo FAO-56 → estrés sin riego, estrés en floración y riego necesario; tipos de año → matriz con confianza; ventana de siembra; web pública sin login en unidades de EE. UU.; demo; página | No se corta |
| **Should** | Chequeo SMAP; calendario NDVI y ventanas desnudas; índice de erosión (SRTM); coberturas sin helada; contexto GRACE | Cada uno cae a "not-available" / "assumed" sin romper nada |
| **Could** | Escenarios de fecha de siembra (temprana / normal / tardía); OpenET (pide clave de API); fecha de floración por grados-día; 2.º estado (Iowa); análisis en vivo de cualquier campo (Cloud Run) | Fuera |

---

## 6. Preguntas para mentores (en orden)

1. **Estado:** ¿oeste de Kansas o centro de Iowa? ¿Conoce a un productor o extensionista de K-State que pueda revisar las rotaciones?
2. **Rotaciones:** ¿las 4 propuestas (§1) son realistas para un productor grande de maíz con riego sobre el Ogallala? ¿Qué riesgo local olvidamos (plagas, mercado, asignación de agua)?
3. **Tipo de año:** ¿le parece bien dividir por años secos / normales / húmedos (terciles de lluvia abr–sep) en vez de ENSO para EE. UU.?
4. **Siembra:** ¿qué umbral de temperatura del suelo y de helada usan los extensionistas de Kansas? Usamos 10 °C (50 °F) y 7 días sin helada.
5. **Floración:** ¿con qué contrastamos el estrés en VT–R1: rendimientos del condado (NASS) o Crop-CASMA?
6. **SMAP:** el píxel de 9 km mezcla pivotes con riego y secano. ¿Basta comparar anomalías mensuales contra la corrida sin riego como chequeo de consistencia? ¿Usar L4 (SPL4SMGP)?
7. **Erosión:** ¿un índice relativo estilo RUSLE (lluvia × suelo × pendiente SRTM × cobertura) es aceptable para comparar rotaciones en un mismo campo?
8. **Incertidumbre:** ¿cómo mostrarla sin falsa precisión? Usamos rangos p10–p90, número de años y niveles alta/media/baja.
9. **Jueces:** ¿un demo con un campo precalculado cuenta como "funcional", o esperan análisis en vivo?
10. **Datos no NASA** (SSURGO y Crop Sequence Boundaries del USDA) como insumos locales: ¿algún problema para Relevance?

**Para la Local Lead** (contacto público en la página del evento local de Trujillo): ¿hay juzgamiento o pitch local? ¿A qué hora? El horario local está vacío.

---

## 7. Marca e historia

**Nombre (DECIDIR).** Son sugerencias de SI; si se usa alguna, se declara en el campo de SI.

| Opción | Tagline (inglés, para jueces) |
|---|---|
| **Surco** | *Your field's next rotation, tested against 45 years of climate.* |
| **Chacra 45** | *45 seasons of satellite memory for one field's next choice.* |
| **Field Shift** (nombre del reto) | *See which rotation holds up in dry years.* |

**Narrador: el observador orbital.** Un visitante que mira el mismo campo cada día desde 1981.
No sabe de agricultura; solo ve verdes que suben y bajan, tierra mojada y seca, y que algunos años
(los secos) son distintos. Ve patrones, pero no sabe lo que le importa al agricultor, así que le
pregunta sus prioridades. Esa humildad es el mensaje del reto: la herramienta **apoya, no
reemplaza**. Nada de logos ni insignias de la NASA; el narrador no es la NASA.

**Voz.** Frases cortas. Números con rango ("30 días (24–36)"). Decir "escenario, no pronóstico".
Decir "no sabemos" cuando no sabemos.

**Identidad visual (propuesta)**

| Token | Color | Uso |
|---|---|---|
| tierra | `#6B4F3A` | títulos, suelo |
| clorofila | `#3E7D4F` | NDVI, cultivo |
| agua | `#2F6E9E` | humedad, riego |
| seco | `#D9822B` | columna años secos |
| humedo | `#1F8A8A` | columna años húmedos |
| normal | `#8A8F98` | columna años normales |
| papel / tinta | `#F6F2EA` / `#1E1E1E` | fondo / texto |

Naranja ↔ verde azulado en lugar de rojo/verde para no excluir a personas daltónicas.
Tipografías con licencia OFL: **Fraunces** (títulos), **IBM Plex Sans** (interfaz), **IBM Plex
Mono** (datos). No usar las fuentes de Space Apps (Fira Sans, Overpass) salvo que sigamos su guía
de marca.

**Demo — si son 7 diapositivas (en inglés):** 1) título, equipo y miembros; 2) el problema en la
voz del observador; 3) qué hace la herramienta (captura); 4) cómo funciona: calendario → gemelo →
fases; 5) datos NASA usados (SMAP, POWER, MODIS, IMERG, SRTM) y socios (Sentinel-2); 6) la matriz
y lo que no sabemos (límites); 7) impacto y próximos pasos.
**Si es video de 30 s:** 0:00 equipo · 0:02 reto · 0:05 nombre y tagline · 0:10 cómo funciona y
datos NASA · 0:20–0:30 impacto. Subtítulos en inglés; marca de agua visible en todo lo generado con SI.

---

## 8. Cuentas y accesos

Cada persona hace sus propios inicios de sesión. Nadie comparte contraseñas por Discord.
Detalle de las 10 ofertas globales y su estado: [docs/setup/ACCOUNTS.md](setup/ACCOUNTS.md).

| Cuenta | Estado | Quién | Para qué | Cuándo | Si falla |
|---|---|---|---|---|---|
| Space Apps: inscrito en **Trujillo**, no en lista de espera | Verificar | Los 6 | Elegibilidad | Ahora | Escribir a la Local Lead |
| GitHub: repo público + 5 colaboradores | Pendiente | Richard | Código; enlace "Final Project" | Sáb 13:30 | — |
| [NASA Earthdata Login](https://urs.earthdata.nasa.gov) (+ autorizar NSIDC y GES DISC) | Pendiente | Miguel, Richard, Denise | AppEEARS, SMAP, IMERG | Sáb 13:30 | El gemelo corre solo con POWER (sin login) |
| [AppEEARS](https://appeears.earthdatacloud.nasa.gov): pedido por punto (SMAP SPL3SMP_E, MOD13Q1 NDVI, SRTM) | Pendiente | Miguel | Validación + calendario | **Antes de 14:00** | Microsoft Planetary Computer (oferta global; leer STAC no pide cuenta) |
| Firebase: proyecto **`field-shift-datacorn`** (plan Spark, sin tarjeta) | ✅ Creado | Richard: `firebase login` y agregar al equipo como Editor | Hosting público en `https://field-shift-datacorn.web.app` | Sáb 16:30 (1.er deploy) | GitHub Pages |
| Google Cloud USD 300 | ❌ No elegible en la cuenta de Richard (trial ya usado) | Un compañero sin trial, solo si hiciera falta | Análisis en vivo (Could) | — | Quedarse en estático |
| Earth Engine | Opcional | — | NDVI a escala | — | Planetary Computer |
| GitHub Copilot Free | ✅ Activo (Richard) | Cada quien lo activa en su cuenta | Asistencia de código (declararla como SI) | — | — |
| Meteomatics (pronóstico) | Opcional | Richard | No está en el camino Must | — | — |
| Dominio gratis (`fieldshift.earth` disponible) | Opcional | Richard, tras decidir la marca | URL más corta | Dom | El `*.web.app` basta |
| Copernicus Data Space | Opcional | Denise | Sentinel-2 | Si sobra tiempo | Planetary Computer |
| Google Slides o YouTube | Pendiente | Camila | Enlace público del demo | Dom 16:00 | Google Drive con acceso público |

**Puesta a punto en cada computadora** (Node ≥ 22.23, Python 3.12, `uv`, `pnpm`):

```bash
git clone <url-del-repo> && cd field-shift
```

```bash
cd pipeline && uv sync && uv run pytest
```

```bash
cd web && pnpm install && pnpm dev
```

Earthdata en la computadora (cada quien, una vez; guarda la sesión en `~/.netrc`, fuera del repo):

```bash
cd pipeline && uv run --extra earthdata python -c "import earthaccess; earthaccess.login(persist=True)"
```

---

## 9. Qué evaluar en cada checkpoint

| Puerta | Pregunta | Prueba |
|---|---|---|
| Datos (sáb 17:00) | ¿Tenemos 1981–2025 para el campo? | Cuántos días con NaN en POWER (incluido `TSOIL1`); perfil SSURGO; 15 años por tipo; años con maíz por celda (≥5, o confianza baja) |
| Ciencia (sáb 21:00) | ¿El gemelo es creíble? | Test FAO-56 Ejemplo 18 en verde; ETc anual vs lluvia razonable; nada en cero por falta de datos |
| Validación (dom 09:00) | ¿Qué podemos afirmar? | Estado SMAP (`consistent`/`weak`/`inconsistent`) escrito tal cual en la ficha y la página; **no** decir que valida las alternativas |
| Producto (dom 14:00) | ¿Un agricultor la entiende? | Alguien fuera del equipo, en 2 minutos y en el celular, explica la matriz |
| Envío (dom 17:30) | ¿Cumple las reglas? | Checklist §6 de [compliance](submission/SUBMISSION-COMPLIANCE.md); ventana privada; sin logos NASA; SI declarada |
| Rúbrica (dom 09:00 y 14:00) | ¿Cómo puntuamos? | Puntaje 1–5 en Impacto, Creatividad, Validez, Relevancia y Presentación; arreglar primero lo más bajo |

## 10. Reglas que no se negocian

Todo en inglés en la página del proyecto · enlaces públicos sin login · ≥1 dato de la NASA central
a la solución · citar **todas** las fuentes con licencia · declarar la SI (marca de agua en
imágenes/video, etiqueta en código) · la idea no puede venir de la SI · nada de logos NASA, datos
personales, menores de edad ni promoción comercial · demo ≤30 s o ≤7 diapositivas.
Detalle y fuentes: [SUBMISSION-COMPLIANCE.md](submission/SUBMISSION-COMPLIANCE.md).
