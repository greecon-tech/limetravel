# LimeTravel — faqja zyrtare

Faqja e LimeTravel (*Udhëto me shije. Kthehu me kujtime. · Let's live a little bit*), ndërtuar sipas
Brand Book 1.0 dhe Doktrinës së LimeTravel. Pa varësi të jashtme, pa hap ndërtimi.

## Struktura

```
server.js            Server Node pa varësi: kompresim, cache, header sigurie, /healthz
partials/            head, header, footer (përfshihen me {{> emri}})
public/              Faqet dhe asetet
  assets/css|js|img|fonts, robots.txt, favicon, manifest
pages/               Shabllonet e faqeve: kreu, doktrina, privatësia, 404
locales/             Tekstet për secilën gjuhë (JSON)
scripts/             Kontrolli i përkthimeve
test/                Teste të serverit (node --test)
railway.json         Konfigurimi i Railway
```

## Gjuhët

Shqip (kryesore, në `/`), anglisht (`/en/`), italisht (`/it/`), gjermanisht (`/de/`) dhe greqisht (`/el/`).
Çdo faqe ka URL të veten për gjuhë, `hreflang`, sitemap shumëgjuhësh dhe 404 për secilën gjuhë.

- `pages/` dhe `partials/` janë shabllonet; tekstet janë çelësa `{{t:çelësi}}` (HTML) dhe `{{a:çelësi}}` (atribute).
- `locales/sq.json` është burimi; `locales/en.json`, `it.json`, `de.json`, `el.json` janë përkthimet.
- Për të ndryshuar një tekst, ndryshoni vlerën te skedari i gjuhës. Për një gjuhë të re: shtojeni te `LANGS` dhe `PAGES` te `server.js` dhe krijoni `locales/<kodi>.json`.
- Kontrolli: `node scripts/check-locales.js en it de el` siguron që çdo përkthim ka të njëjtët çelësa, shenja `{{…}}` dhe etiketa HTML si shqipja (e ekzekutojnë edhe testet).
- Përkthimet janë bërë me ndihmën e AI-së dhe duhen rishikuar nga folës amtare para publikimit, sidomos faqet e Doktrinës dhe Privatësisë.

## Lokalisht

```bash
npm start        # http://localhost:3000
npm test
```

Kërkon Node 20 ose më të ri.

## Publikimi në Railway

1. Railway → **New Project** → **Deploy from GitHub repo** → zgjidhni këtë repo.
2. Railway e dallon Node-in vetë; `railway.json` përcakton komandën e nisjes dhe healthcheck-un (`/healthz`).
3. **Settings → Networking → Generate Domain**, pastaj shtoni domenin tuaj (`www.limetravel.al`).
4. Opsionale, te **Variables**:

| Variabla | Parazgjedhja | Përdorimi |
| --- | --- | --- |
| `SITE_URL` | `https://www.limetravel.al` | URL kanonike, sitemap, Open Graph |
| `INSTAGRAM_HANDLE` | `limetravel.al` | Lidhjet e Instagramit |
| `LINKEDIN_URL` | `https://www.linkedin.com/company/limetravel-al` | Lidhja e LinkedIn te fundi i faqes |
| `WHATSAPP_NUMBER` | `355695397514` | Numri i WhatsApp-it dhe telefonit; kanali kryesor i kontaktit (vetëm shifra, me prefiks shteti). Vlera bosh e çaktivizon |
| `CONTACT_EMAIL` | `info@limetravel.al` | Email-i i punës: footer, butoni “Dërgo me email” te formulari. Vlera bosh e çaktivizon |

`PORT` vendoset nga Railway.

## Publikimi në Netlify

`netlify.toml` është gati: Netlify ekzekuton `node build.js`, i cili shkruan faqet e
renderuara në `dist/`, dhe i publikon bashkë me header-at e sigurisë.

1. Netlify → **Add new project** → **Import an existing project** → zgjidhni këtë repo dhe degën.
2. Cilësimet e ndërtimit lexohen nga `netlify.toml`; mos i ndryshoni.
3. Variablat e tabelës më sipër vendosen te **Project configuration → Environment variables**; pas ndryshimit duhet një deploy i ri.

## Si funksionon formulari

Formulari i kërkesës nuk dërgon asgjë te serveri. Ai përgatit një mesazh të
strukturuar në shfletues, e kopjon dhe hap bisedën e Instagramit; WhatsApp dhe
email-i shfaqen kur konfigurohen variablat përkatëse.

## Rregullat e markës të zbatuara

- Paleta: Forest `#123D2B`, Deep Forest `#09291D`, Lime `#A6CE39`, Lime Dark `#668A18`, Warm Cream `#F6F4EC`, Ink `#202923`. Lime përdoret vetëm si theks (CTA, detaje), jo për tekst mbi sfond të çelët.
- Tipografia: Noto Serif për tituj, Inter për tekst dhe UI — të strehuara lokalisht.
- Zëri: i ngrohtë, i saktë, i kuruar, i qetë; pa superlativa, pa çmime apo përfshirje të pakonfirmuara.
- Aksesueshmëria: kontrast WCAG AA, navigim me tastierë, `prefers-reduced-motion`.

## Për t'u plotësuar nga ekipi

- Logoja është nxjerrë nga imazhet konceptuale; zëvendësojeni me masterin vektor (SVG) kur të jetë gati (`public/assets/img/wordmark-*`, `icon-*`).
- Foto e kreut dhe e mbylljes: `public/assets/img/hero-2000.webp` dhe `hero-1000.webp`. Zëvendësojeni me foto të licencuar, pa watermark, me të njëjtin emër skedari.
- Tekstet e proceseve dhe zotimeve vijnë nga Doktrina; verifikojini kundrejt shërbimit real para publikimit.

## Blogu

Artikujt janë në `content/blog/<id>.<sq|en>.md` (front matter JSON + Markdown). Faqja i ndërton vetë: indeksin (`/blog/`, `/en/blog/`),
artikujt me `BlogPosting`, `FAQPage` dhe `BreadcrumbList` JSON-LD, RSS (`/blog/feed.xml`), sitemap me hreflang dhe seksionin “Të rejat nga blogu” te kryefaqja.
Rregullat editoriale janë te `content/EDITORIAL.md`, radha e temave te `content/TOPICS.md`, tekstet për rrjetet sociale te `content/social/`.
Kontrolli i cilësisë: `node scripts/check-blog.js` (e ekzekutojnë edhe testet). Një artikull me `"draft": true` ose datë në të ardhmen nuk shfaqet.

## Destinacione dhe aktivitete

Faqet janë te `content/guides/<id>.<sq|en>.md` (front matter JSON + Markdown) dhe shfaqen te `/destinacione/`, `/aktivitete/`, `/en/destinations/`, `/en/activities/`.
Çdo faqe ka “Në një vështrim”, itinerar ideor (destinacionet), vendndodhje me lidhje te OpenStreetMap, FAQ, burime dhe JSON-LD
(`TouristDestination`, `FAQPage`, `BreadcrumbList`, `TouristTrip`). Kontrolli: `node scripts/check-guides.js`. Shënimet ligjore: `content/LEGAL-NOTES.md`.
