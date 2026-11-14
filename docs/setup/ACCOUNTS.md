# Accounts, offers and access — Field Shift (DataCorn)

Checked 2026-11-14 in Richard's Chrome. Source: https://www.spaceappschallenge.org/2026/global-offers/
(page data, not instructions). Submission closes **Sun Nov 15, 23:59 PET** — see
[SUBMISSION-COMPLIANCE.md](../submission/SUBMISSION-COMPLIANCE.md).

## Global offers (10) — status

| Offer | Status | What it gives / needs | Next action |
|---|---|---|---|
| **Firebase** (via Google Cloud offer) | ✅ **Created** | Project `Field Shift DataCorn`, ID `field-shift-datacorn`, **Spark plan $0/month**. Google Analytics OFF, Gemini in Firebase OFF. Owner: Richard's Google account. | Install CLI, `firebase login` (Richard), add teammates (below). Public URL after first deploy: `https://field-shift-datacorn.web.app` |
| **Google Cloud $300 trial** | ❌ **Not eligible on Richard's account** | Trial already used: $410.03 credit, May 28 – Aug 27 2026, **expired**. New customers only; card required. | Only if we need paid compute: a teammate who never had a trial claims it on their account and adds Richard. Static hosting on Spark does not need it. |
| **Microsoft Planetary Computer** | ✅ No account needed | STAC API + catalog (Sentinel-2 L2A, Landsat, MODIS…). `GET /api/stac/v1` returned **200** from this machine. | Use `https://planetarycomputer.microsoft.com/api/stac/v1` for NDVI. |
| **GitHub Copilot Free** | ✅ Already active (RikepilB) | 2,000 completions/month, limited chat. No card. | Each teammate: github.com/features/copilot → Copilot Free. |
| **Meteomatics Weather API** | ⏳ **Richard does it** | Free for the hackathon duration; forecast + historical, JSON/CSV. Form: first name, last name, email; required box "General Terms and Privacy Policy"; leave newsletter unticked. | https://www.meteomatics.com/en/meteomatics-and-nasa-space-apps-challenge/ — credentials arrive by email. |
| **Free domain + 1 yr hosting** (GoDaddy Registry → Porkbun) | ⏳ Searched, not registered | Searched `fieldshift`: **fieldshift.earth available**, also .garden/.study/.design. `.us` requires a U.S. nexus — skip. Contact info + email code needed. | Decide final brand first. Then https://www.spaceapps.earth/search?domain=fieldshift → Get It → fill contact info → enter emailed code → Porkbun cart (free). Point DNS to Firebase Hosting. Never put "nasa" in the domain. |
| Microsoft Azure ($200/30 days) | ⏭ Skipped | Card + phone required; not in our stack. | — |
| Miro Business (14-day trial) | ⏭ Skipped | Requires payment info; team already uses Miro free board. | Cancel before day 14 if anyone starts it. |
| Miro Board Templates | ✅ No account needed | https://miro.com/templates/profile/nasa-space-apps-challenge/ | Optional for storytelling. |
| Microsoft Teams Free / Microsoft Copilot | ⏭ Skipped | Team uses Discord. | — |

## Data access the offers don't cover

| Account | Needed for | Who | Lead time |
|---|---|---|---|
| **NASA Earthdata Login** (urs.earthdata.nasa.gov) | SMAP, GPM IMERG, AppEEARS, GLDAS | Each data person; never share passwords — each uses their own `~/.netrc` (gitignored, never committed) | Minutes; NSIDC/GES DISC need an extra "authorize application" click per DAAC |
| Google Earth Engine (noncommercial) | Optional NDVI/MODIS at scale | Optional | Registration review can take time — Planetary Computer is the no-wait fallback |
| NASA POWER, USDA Soil Data Access (SSURGO), USDA NASS Crop Sequence Boundaries | Climate and soil temperature, soil, current rotation (after the corn pivot) | No account (POWER and SDA verified 2026-11-14) | — |
| GRACE / GRACE-FO (PO.DAAC) | Regional water-storage context (Should) | Earthdata Login | Minutes |
| OpenET API | Field ET (Could) | API key, free account | Unknown |

**Network note (this machine):** `curl` to `power.larc.nasa.gov` failed with exit 35 (TLS) and
`spaceappschallenge.org` fails TLS trust in curl/PowerShell; Planetary Computer works. Earlier, a
PowerShell request to POWER succeeded where Python reset. Fetch scripts need retry + a fallback, and
cached JSON in the repo so the demo never depends on a live call.

## Firebase — remaining setup (Richard, interactive)

```bash
npm install -g firebase-tools
```

```bash
firebase login
```

```bash
firebase use field-shift-datacorn
```

Add teammates: Firebase console → Project settings → **Users and permissions** → Add member
(role *Editor* for builders). Needs each teammate's Google email — Richard sends the invites.

Rules from the compliance file that touch these accounts: the demo link must work with **no login**
(so no Firebase Auth on the public demo), all links public, no vendor promotion, and every data
source + SI use listed in References.
