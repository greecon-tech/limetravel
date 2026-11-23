# Rregullat editoriale të blogut LimeTravel

Ky dokument është manuali për çdo artikull të ri (ndiqet edhe nga detyra javore). Qëllimi: të ndihmojmë njerëzit me
informacion të saktë dhe, si rezultat, të renditemi mirë në Google (SEO) dhe në përgjigjet e motorëve AI (AEO).

## 1. Kush jemi dhe për kë shkruajmë
LimeTravel është agjenci udhëtimi në Shqipëri: udhëtime turistike, bileta avioni dhe shërbime vizash turistike.
Lexuesit: shqiptarë që udhëtojnë jashtë (viza, bileta, rregulla kufitare) dhe të huaj që planifikojnë udhëtime në/nga Shqipëria.
Zëri: i qetë, i saktë, i ngrohtë; pa superlativa, pa premtime që nuk i mbajmë, pa presion shitjeje (shih Doktrinën).

## 2. Proçesi javor (2 tema në javë, secila në shqip dhe anglisht)
1. Lexo `content/TOPICS.md`. Zgjidh 2 tema nga “Radha” (ose shto tema të reja nëse ka ndryshime të mëdha në industri).
2. KËRKIM: përdor WebSearch/WebFetch (ose një agjent `general-purpose` për lexim burimesh). Faktet vijnë vetëm nga burime
   ZYRTARE (qeveri, BE, ambasada, aeroporti, kompani ajrore, VFS). Media përdoret vetëm për të konfirmuar data/lajme.
3. Shkruaj dy skedarë për çdo temë: `content/blog/<id>.sq.md` dhe `content/blog/<id>.en.md`. Versioni anglisht NUK është
   përkthim fjalë për fjalë: përshtate për lexuesin dhe për termat që kërkohen në anglisht.
4. Shkruaj tekstet për rrjetet sociale te `content/social/<data>.md`: për çdo artikull një postim Instagram (shqip) dhe një LinkedIn
   (anglisht), me të njëjtat fakte, pa superlativa dhe me linkun e artikullit (formati si te skedarët ekzistues).
5. Ekzekuto `node scripts/check-blog.js` dhe `npm test`. Duhet të kalojnë të dyja.
6. Rishiko artikujt e mëparshëm: nëse një rregull, tarifë ose datë ka ndryshuar (p.sh. data e ETIAS, tarifat e vizës së MB-së), përditësoje
   dhe ndrysho `updated` dhe `reviewed`.
7. Përditëso `content/TOPICS.md` (zhvendos temën te “Të publikuara” me datën).
8. Commit dhe push në degën e punës (`git push -u origin <dega>`). Mos krijo pull request.
9. Raporto shkurt: titujt e artikujve, burimet kryesore, dhe çdo fakt që nuk u konfirmua.

## 3. Rregulla të fakteve (të detyrueshme)
- Asnjë fakt pa burim. Çdo numër (tarifë, afat, datë) duhet të gjendet në një burim zyrtar të lexuar vërtet.
- Nëse diçka nuk u konfirmua, ose shkruaj “nuk është konfirmuar zyrtarisht” ose hiqe. Asnjëherë mos hamendëso.
- Çdo artikull ka datën e rishikimit (`reviewed`) dhe shënim që rregullat ndryshojnë dhe duhet kontrolluar burimi zyrtar.
- Asnjë garanci vize/miratimi. Asnjë “më i miri”, “100%”, “pa rrezik”. Çmimet e LimeTravel nuk përmenden pa verifikim nga ekipi.
- Mos shpik shërbime, çmime, afate apo zotime të LimeTravel. Përdor vetëm: udhëtime turistike, bileta avioni, shërbime
  vizash turistike, WhatsApp +355 69 539 7514, info@limetravel.al.
- Përditëso artikujt e vjetër kur ndryshojnë rregullat (ndrysho `updated` dhe `reviewed`), mos krijo dublikatë.

## 4. Struktura SEO + AEO (kontrollohet nga `scripts/check-blog.js`)
- `title` ≤ 65 shkronja, me fjalën kyçe kryesore në fillim; `description` 110–160 shkronja.
- `summary` (60–420 shkronja): përgjigjja e plotë dhe e drejtpërdrejtë në 2–3 fjali. Shfaqet lart dhe është përgjigjja që
  motorët AI mund ta citojnë. Shkruaje si përgjigje, jo si hyrje.
- Titujt H2 si pyetje që njerëzit i kërkojnë realisht (“A kanë nevojë shqiptarët për vizë për…?”). Përgjigja në fjalinë e parë.
- Të paktën 3 H2, trup ≥ 600 fjalë, një tabelë krahasimi ose listë hapash kur ka kuptim.
- `faq`: 3–6 pyetje/përgjigje në tekst të thjeshtë (≤ 700 shkronja përgjigja), pa markdown. Bëhen `FAQPage` JSON-LD.
- `sources`: të paktën 2 burime https, kryesisht zyrtare. Shfaqen si “Burimet” dhe hyjnë te `citation` JSON-LD.
- `tags` 2–6; etiketa e parë shfaqet si eyebrow.
- Lidhje të brendshme: te kontakti `[…](/#kerkese)` (sq) ose `[…](/en/#kerkese)` (en); lidhu me artikuj të tjerë të blogut kur lidhen.
- Fjalët kyçe sq (shembuj): bileta avioni Tiranë, viza turistike, udhëtime turistike, ETIAS shqiptarët, viza Schengen.
  Fjalët kyçe en: Albanian citizens visa, flights from Tirana, Albania travel requirements. Përdori natyrshëm, jo me përsëritje.
- Datat: `date` = dita e publikimit; një artikull me datë në të ardhmen nuk shfaqet deri atëherë. `draft: true` e fsheh.

## 5. Formati i skedarit
```
---
{ ...front matter JSON... }
---

## Titull H2 si pyetje

Tekst...
```
Markdown i mbështetur: `##`/`###`, paragrafë, `- ` dhe `1. ` (një rresht për artikull), `**bold**`, `*italic*`,
`[tekst](url)`, `> citat`, tabela `|---|`. Pa HTML të papërpunuar dhe pa H1 (titulli vjen nga front matter).
Emri i skedarit: `<id>.<sq|en>.md`; `slug` ASCII kebab-case, i ndryshëm për çdo gjuhë.

## 6. Pas publikimit
Dega e punës deploy-ohet vetë. Faqja përditëson sitemap-in, RSS-in (`/blog/feed.xml`, `/en/blog/feed.xml`),
hreflang dhe seksionin “Të rejat nga blogu” në kryefaqe automatikisht.

## 7. Faqet e destinacioneve dhe aktiviteteve (`content/guides/`)
Të njëjtat rregulla fakti dhe SEO/AEO si për blogun, me këto shtesa (kontrollohen nga `node scripts/check-guides.js`):
- `kind`: `destination` ose `activity`; `name` (emri i shkurtër), `region`, `order`; për destinacionet `location` {label, lat, lon} dhe `itinerary` me të paktën 2 ditë.
- `facts`: të paktën 3 rreshta label/value (“Në një vështrim”). Vetëm fakte të konfirmuara; kur burimet ndryshojnë, jepni interval.
- Itineraret janë IDE, jo programe të konfirmuara; nuk përmbajnë çmime. Çmimi dhe disponueshmëria jepen vetëm pas verifikimit nga ekipi.
- Mos kopjoni tekste, itinerare, harta, foto apo çmime nga faqe të operatorëve të tjerë. Përdorni vetëm burime publike zyrtare dhe tekst origjinal.
- Pa foto me watermark ose pa licencë të dokumentuar (shih `content/LEGAL-NOTES.md`).
- Foto: çdo faqe guide ka `"photo": "<id>"` të regjistruar te `content/photos.json` (autor, licencë CC BY/CC BY-SA/CC0/PD, burimi në Wikimedia Commons)
  dhe skedarët `public/assets/img/places/<id>-800.webp`, `-1800.webp`, `-og.jpg`. Mos përdorni foto pa licencë të dokumentuar.
- Harta: çdo destinacion ka `"map": {"line": true|false, "stops": [{name, lat, lon, day}]}`. Koordinatat verifikohen nga OpenStreetMap (Nominatim).
