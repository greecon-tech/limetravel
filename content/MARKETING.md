# Plani i marketingut — LimeTravel (gati për nisje)

## 1. Mesazhi
- Slogani: **Udhëto me shije. Kthehu me kujtime.** / *Travel with taste. Return with memories.*
- Premtimi: udhëtime të menduara me kujdes, nga ideja te kthimi. Informacion i qartë, çmim i konfirmuar pas verifikimit, një person real.
- Shërbimet: udhëtime turistike, bileta avioni, shërbime vizash turistike. Kontakt: WhatsApp +355 69 539 7514, info@limetravel.al.
- Zëri: i qetë, i saktë, pa superlativa. Asnjë “më i miri”, “100%”, “oferta e shekullit”.

## 2. Çfarë ka tani live (pas deploy-it)
| Faqe | Qëllimi | Fjalë kyçe (temat, jo vëllime kërkimi) |
| --- | --- | --- |
| `/destinacione/` dhe 3 faqe | Frymëzim + SEO lokal | Alpet Shqiptare Theth Valbonë, Riviera Shqiptare, Berat Gjirokastër |
| `/aktivitete/` dhe 2 faqe | Interes sipas aktivitetit | ecje në natyrë Shqipëri, zbulim kulturor Shqipëri |
| `/blog/` (2 artikuj/javë) | AEO: përgjigje të drejtpërdrejta | ETIAS shqiptarët, viza Mbretëri e Bashkuar, bileta avioni Tiranë |
| `/en/...` | Të njëjtat në anglisht | Albania travel guide, Albanian citizens visa, Theth Valbona hike |

## 3. Lista e nisjes (një herë)
1. **Google Search Console** (verifikimi i domenit `limetravel.al` nga paneli i DNS-it) dhe dërgoni `https://www.limetravel.al/sitemap.xml`. Kontrolloni “Rezultate të pasura” për FAQ dhe Breadcrumb.
2. **Bing Webmaster Tools** (importoni nga Search Console).
3. **Google Business Profile** me adresën, orarin, WhatsApp-in dhe lidhjen e faqes.
4. Instagram `@limetravel.al`: biografia me lidhjen `https://www.limetravel.al/destinacione/`; LinkedIn faqja e kompanisë me lidhjen e faqes.
5. WhatsApp Business: mesazh përshëndetës, mesazh jashtë orarit dhe etiketa (viza, bileta, udhëtime).
6. Kontrollojeni faqen në mobile dhe me Lighthouse; kontrolloni që `https://www.limetravel.al/en/` ka `hreflang` te burimi i faqes.
7. Mos publikoni emrin, logon ose çmimet e Adventure & Fun derisa të keni marrëveshjen e nënshkruar (shih seksionin 6).

## 4. Ritmi javor (automatik + ekipi)
- Detyra javore shkruan 2 artikuj (sq + en) dhe tekstet sociale te `content/social/`.
- Ekipi: postoni tekstet, përgjigjuni mesazheve brenda afatit të brendshëm (Doktrina), kërkoni feedback me leje pas çdo udhëtimi.
- Çdo muaj: rishikoni faqet e destinacioneve (orare, rrugë, sezon) dhe përditësoni `reviewed`.

## 5. Matja
Faqja nuk përdor analitikë (shih Privatësinë). Mjaftojnë: Search Console (shfaqje, klikime, pyetje kërkimi), numri i mesazheve WhatsApp
sipas temës (regjistër i thjeshtë javor) dhe rritja e ndjekësve. Nëse shtohet analitikë, përditësoni Privatësinë dhe kërkoni pëlqim.

## 6. Bashkëpunimi me Adventure & Fun Albania (kur të nënshkruhet)
Mos kopjoni nga faqja e tyre. Kërkoni nga ata, me shkrim:
1. Lejen për të shfaqur turet e tyre te LimeTravel, me emrin e partnerit dhe kushtet e kreditimit.
2. Itineraret, përshkrimet, GPX/harta dhe foto me licencë përdorimi (ose lejen për t'i përdorur).
3. Çmimet neto ose komisionin e dakorduar, kushtet e anulimit, sigurimin dhe garancinë e tyre; kush e vendos çmimin e shitjes.
4. Kush është operatori ligjor i turit dhe kush merr përgjegjësinë ndaj klientit (shih `content/LEGAL-NOTES.md`).
Kur t'i keni, i shtojmë si faqe turesh me kredit dhe çmim të dukshëm sipas kontratës.

## 7. Foto dhe harta
- Fotot janë nga Wikimedia Commons (CC BY / CC BY-SA), të regjistruara te `content/photos.json` me autorin, licencën dhe burimin. Kredia
  shfaqet pranë çdo fotoje. Kur i përdorni në rrjete sociale, shtoni në përshkrim: `Foto: <autori>, <licenca>, Wikimedia Commons`.
- CC BY-SA: nëse e modifikoni fotoja, ripublikojeni me të njëjtën licencë. Prerja për kopertinë dhe kompresimi konsiderohen përshtatje të vogla; ruani kredinë.
- Harta: Leaflet (BSD-2) + pllaka OpenStreetMap, me atribuim të dukshëm. Pllakat e osm.org janë për trafik të moderuar; nëse faqja rritet, kaloni te një ofrues pllakash me çelës (p.sh. MapTiler) ose mbajini vetë.
