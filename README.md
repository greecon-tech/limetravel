# LimeTravel — faqja zyrtare

Faqja e LimeTravel (*Udhëto me mendim · Let's live a little bit*), ndërtuar sipas
Brand Book 1.0 dhe Doktrinës së LimeTravel. Pa varësi të jashtme, pa hap ndërtimi.

## Struktura

```
server.js            Server Node pa varësi: kompresim, cache, header sigurie, /healthz
partials/            head, header, footer (përfshihen me {{> emri}})
public/              Faqet dhe asetet
  index.html         Kreu: premtimi, udhëtimet, si punojmë, doktrina, kërkesa, pyetjet
  doktrina.html      Doktrina publike
  privatesia.html    Privatësia
  404.html
  assets/css|js|img|fonts
test/                Teste të serverit (node --test)
railway.json         Konfigurimi i Railway
```

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
| `CONTACT_EMAIL` | bosh | Shfaq butonin “Dërgo me email” |

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
