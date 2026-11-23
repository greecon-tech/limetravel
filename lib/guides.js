'use strict';

// Faqet e destinacioneve dhe të aktiviteteve: content/guides/<id>.<gjuha>.md
// Të njëjtin format si artikujt e blogut (front matter JSON + Markdown), me fusha shtesë:
// kind, name, region, location{lat,lon}, facts[], itinerary{title,days[]}, related[].
const fs = require('node:fs');
const path = require('node:path');
const blog = require('./blog');

const { e, esc, json, formatDate, ICON } = blog;
const DIR = path.join(__dirname, '..', 'content', 'guides');
const GUIDE_LANGS = ['sq', 'en'];
const KINDS = ['destination', 'activity'];
const SECTION = { destination: { sq: 'destinacione', en: 'destinations' }, activity: { sq: 'aktivitete', en: 'activities' } };
const ui = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', 'guides-ui.json'), 'utf8'));
const photosFile = path.join(__dirname, '..', 'content', 'photos.json');
const photos = fs.existsSync(photosFile) ? JSON.parse(fs.readFileSync(photosFile, 'utf8')) : {};
const PHOTO_LABEL = { sq: 'Foto', en: 'Photo', it: 'Foto', de: 'Foto', el: 'Φωτογραφία' };

// Kreditimi i fotos (CC): titulli, autori, licenca dhe burimi, të gjitha me lidhje.
function creditLine(photoId, lang) {
  const ph = photos[photoId];
  if (!ph) return '';
  return (
    `${e(PHOTO_LABEL[lang] || 'Photo')}: <a href="${esc(ph.source)}" rel="noopener">${e(ph.title.replace(/\.[a-z]+$/i, ''))}</a>, ` +
    `${e(ph.author)}, <a href="${esc(ph.license_url)}" rel="noopener">${e(ph.license)}</a>, Wikimedia Commons`
  );
}
const photoSrc = (id, size) => `/assets/img/places/${id}-${size}.webp`;
const photoImg = (id, lang, { eager = false, sizes = '100vw' } = {}) => {
  const ph = photos[id];
  return (
    `<img src="${photoSrc(id, 1800)}" srcset="${photoSrc(id, 800)} 800w, ${photoSrc(id, 1800)} 1800w" sizes="${sizes}" ` +
    `width="${ph.width}" height="${ph.height}" alt="${e(ph.alt[lang] || ph.alt.en)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`
  );
};

const sectionUrl = (lang, kind) => `${lang === 'sq' ? '' : '/' + lang}/${SECTION[kind][lang]}/`;
const guideUrl = (g) => sectionUrl(g.lang, g.kind) + g.slug;
const osmUrl = (loc) => `https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lon}#map=11/${loc.lat}/${loc.lon}`;

function loadGuides(dir = DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => blog.parsePost(path.join(dir, f)))
    .sort((a, b) => (a.order || 99) - (b.order || 99) || a.id.localeCompare(b.id));
}
const isPublished = (g) => !g.draft;

function validateGuides(guides) {
  const problems = [];
  const add = (g, msg) => problems.push(`${g.file}: ${msg}`);
  const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const seen = new Set();
  const slugs = new Set();
  const ids = new Set(guides.map((g) => g.id));

  for (const g of guides) {
    if (!kebab.test(g.id || '')) add(g, 'id duhet kebab-case');
    if (!GUIDE_LANGS.includes(g.lang)) add(g, 'lang i pavlefshëm');
    if (!KINDS.includes(g.kind)) add(g, `kind duhet ${KINDS.join(' ose ')}`);
    if (g.file !== `${g.id}.${g.lang}.md`) add(g, `emri i skedarit duhet ${g.id}.${g.lang}.md`);
    if (!kebab.test(g.slug || '')) add(g, 'slug duhet ASCII kebab-case');
    if (!g.name || !g.title || g.title.length > 65) add(g, 'name/title mungon ose title >65 shkronja');
    if (!g.description || g.description.length < 110 || g.description.length > 160) add(g, `description duhet 110–160 shkronja (tani ${(g.description || '').length})`);
    if (!g.summary || g.summary.length < 60 || g.summary.length > 420) add(g, 'summary duhet 60–420 shkronja');
    for (const f of ['updated', 'reviewed']) if (!dateRe.test(g[f] || '')) add(g, `${f} duhet YYYY-MM-DD`);
    if (!g.region) add(g, 'region mungon');
    if (g.kind === 'destination') {
      const loc = g.location || {};
      if (typeof loc.lat !== 'number' || typeof loc.lon !== 'number' || loc.lat < 39 || loc.lat > 43 || loc.lon < 18 || loc.lon > 22) add(g, 'location lat/lon mungon ose jashtë Shqipërisë');
      if (!loc.label) add(g, 'location.label mungon');
      if (!g.itinerary || !Array.isArray(g.itinerary.days) || g.itinerary.days.length < 2) add(g, 'itinerary me të paktën 2 ditë mungon');
    }
    if (g.itinerary) for (const d of g.itinerary.days || []) if (!d.title || !d.text) add(g, 'ditë itinerari pa title/text');
    if (!Array.isArray(g.facts) || g.facts.length < 3 || g.facts.some((f) => !f.label || !f.value)) add(g, 'facts duhet të ketë të paktën 3 rreshta label/value');
    if (!Array.isArray(g.tags) || g.tags.length < 2) add(g, 'tags duhet 2+');
    if (g.photo && !photos[g.photo]) add(g, `foto e panjohur: ${g.photo} (shtojeni te content/photos.json)`);
    if (g.photo && photos[g.photo] && (!photos[g.photo].author || !photos[g.photo].license_url)) add(g, `foto ${g.photo}: mungon autori ose lidhja e licencës`);
    if (g.map) {
      if (!Array.isArray(g.map.stops) || g.map.stops.length < 2) add(g, 'map.stops duhet 2+ pika');
      else for (const st of g.map.stops) if (!st.name || typeof st.lat !== 'number' || typeof st.lon !== 'number' || st.lat < 39 || st.lat > 43 || st.lon < 18 || st.lon > 22) add(g, `pikë harte e pavlefshme: ${JSON.stringify(st).slice(0, 60)}`);
    }
    if (g.kind === 'destination' && !g.map) add(g, 'destinacioni duhet të ketë map');
    if (!Array.isArray(g.faq) || g.faq.length < 3) add(g, 'faq duhet 3+');
    else for (const f of g.faq) if (!f.q || !f.a || f.a.length > 700 || /[*`[\]]/.test(f.a)) add(g, `faq e pavlefshme: "${(f.q || '').slice(0, 40)}"`);
    if (!Array.isArray(g.sources) || g.sources.length < 2) add(g, 'sources duhet 2+');
    else for (const s of g.sources) if (!s.title || !/^https:\/\//.test(s.url || '')) add(g, `burim i pavlefshëm: ${JSON.stringify(s).slice(0, 60)}`);
    if (g.words < 330) add(g, `trupi shumë i shkurtër (${g.words} fjalë, minimumi 330)`);
    if (g.headings.length < 3) add(g, 'duhen 3+ tituj H2');
    for (const [, url] of g.body.matchAll(/\]\(([^)\s]+)\)/g)) if (!/^(https:\/\/|\/|#|mailto:)/.test(url)) add(g, `lidhje e pasigurt: ${url}`);
    for (const r of g.related || []) if (!ids.has(r)) add(g, `related i panjohur: ${r}`);
    const key = `${g.id}.${g.lang}`;
    if (seen.has(key)) add(g, `dublikatë ${key}`);
    seen.add(key);
    const sk = `${g.lang}/${g.kind}/${g.slug}`;
    if (slugs.has(sk)) add(g, `slug i dublikuar ${sk}`);
    slugs.add(sk);
  }
  for (const id of ids) for (const lang of GUIDE_LANGS) if (!guides.some((g) => g.id === id && g.lang === lang)) problems.push(`${id}: mungon versioni ${lang}`);
  return problems;
}

function card(g, text) {
  const img = g.photo && photos[g.photo]
    ? `<img class="card__img" src="${photoSrc(g.photo, 800)}" width="800" height="${Math.round((800 * photos[g.photo].height) / photos[g.photo].width)}" alt="" loading="lazy" decoding="async">`
    : '';
  return (
    `<article class="card card--photo"><a class="card__link" href="${guideUrl(g)}">${img}` +
    `<div class="card__body"><p class="card__meta">${e(g.region)}</p><h3>${e(g.name)}</h3><p>${e(g.description)}</p>` +
    `<span class="link">${e(text.read_more)} ${ICON('arrow')}</span></div></a>` +
    (g.photo ? `<p class="card__credit">${creditLine(g.photo, g.lang)}</p>` : '') +
    `</article>`
  );
}

function latestSection(lang, guides) {
  const text = ui[lang];
  const list = guides.filter((g) => g.lang === lang && g.kind === 'destination').slice(0, 3);
  if (!text || !list.length) return '';
  return (
    `<section class="section" aria-labelledby="destinations-title"><div class="container">` +
    `<div class="section__head reveal"><p class="eyebrow">${e(text.destination.eyebrow)}</p><h2 id="destinations-title">${e(text.latest_title)}</h2></div>` +
    `<div class="cards">${list.map((g) => card(g, text)).join('')}</div>` +
    `<p class="cards__all"><a class="link" href="${sectionUrl(lang, 'destination')}">${e(text.all_destinations)} ${ICON('arrow')}</a></p></div></section>`
  );
}

const head = (text, title, description, extra, ld) => `<!doctype html>
<html lang="{{LANG}}">
<head>
  <meta charset="utf-8">
  <title>${e(title)}</title>
  <meta name="description" content="${e(description)}">
  <link rel="canonical" href="{{CANONICAL}}">
  {{&HREFLANG}}
  <meta property="og:title" content="${e(title)}">
  <meta property="og:description" content="${e(description)}">
  <meta property="og:url" content="{{CANONICAL}}">
  ${extra || ''}
  {{> head}}
  <script type="application/ld+json">${json(ld)}</script>
</head>
<body>
{{> header}}`;

function indexSource(lang, kind, guides, siteUrl) {
  const text = ui[lang];
  const k = text[kind];
  const list = guides.filter((g) => g.lang === lang && g.kind === kind);
  const url = siteUrl + sectionUrl(lang, kind);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: k.index_h1,
    description: k.index_description,
    inLanguage: lang,
    url,
    mainEntity: { '@type': 'ItemList', itemListElement: list.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: siteUrl + guideUrl(g), name: g.name })) },
  };
  return `${head(text, k.index_title, k.index_description, '', ld)}
<main id="permbajtja" class="page">
  <header class="page__head container container--narrow">
    <p class="eyebrow">${e(k.eyebrow)}</p>
    <h1 class="display display--sm">${e(k.index_h1)}</h1>
    <p class="lead">${e(k.index_lead)}</p>
  </header>
  <section class="container blog-list"><div class="cards">${list.map((g) => card(g, text)).join('')}</div></section>
</main>
{{> footer}}
</body>
</html>`;
}

function guideSource(g, guides, siteUrl) {
  const text = ui[g.lang];
  const url = siteUrl + guideUrl(g);
  const kindLabel = text.kinds[g.kind];
  const waText = encodeURIComponent(text.wa_text.replace('{title}', g.name));
  const byId = (id) => guides.find((x) => x.id === id && x.lang === g.lang);
  const related = (g.related || []).map(byId).filter(Boolean);
  const graph = [
    g.kind === 'destination'
      ? {
          '@type': 'TouristDestination',
          name: g.name,
          description: g.description,
          url,
          inLanguage: g.lang,
          geo: { '@type': 'GeoCoordinates', latitude: g.location.lat, longitude: g.location.lon },
          containedInPlace: { '@type': 'Country', name: 'Albania' },
        }
      : { '@type': 'WebPage', name: g.title, description: g.description, url, inLanguage: g.lang, dateModified: g.updated, about: { '@type': 'Thing', name: g.name } },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'LimeTravel', item: siteUrl + (g.lang === 'sq' ? '/' : `/${g.lang}/`) },
        { '@type': 'ListItem', position: 2, name: text[g.kind].eyebrow, item: siteUrl + sectionUrl(g.lang, g.kind) },
        { '@type': 'ListItem', position: 3, name: g.name, item: url },
      ],
    },
    { '@type': 'FAQPage', mainEntity: g.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ];
  if (g.itinerary) {
    graph.push({
      '@type': 'TouristTrip',
      name: g.itinerary.title,
      description: text.itinerary_note,
      itinerary: { '@type': 'ItemList', itemListElement: g.itinerary.days.map((d, i) => ({ '@type': 'ListItem', position: i + 1, name: d.title, description: d.text })) },
    });
  }
  const ld = { '@context': 'https://schema.org', '@graph': graph };

  const facts = `<section class="facts" aria-labelledby="facts-title"><h2 id="facts-title">${e(text.glance)}</h2><dl>${g.facts
    .map((f) => `<div><dt>${e(f.label)}</dt><dd>${e(f.value)}</dd></div>`)
    .join('')}</dl></section>`;
  const toc =
    g.headings.length >= 3
      ? `<nav class="toc" aria-label="${e(text.contents)}"><h2>${e(text.contents)}</h2><ol>${g.headings.map((h) => `<li><a href="#${h.id}">${e(h.text)}</a></li>`).join('')}</ol></nav>`
      : '';
  const itinerary = g.itinerary
    ? `<section class="itinerary" aria-labelledby="itinerary-title"><h2 id="itinerary-title">${e(g.itinerary.title)}</h2><p class="itinerary__note">${e(text.itinerary_note)}</p><ol class="itinerary__days">${g.itinerary.days
        .map((d) => `<li><h3>${e(d.title)}</h3><p>${e(d.text)}</p></li>`)
        .join('')}</ol></section>`
    : '';
  const location =
    g.kind === 'destination'
      ? `<section class="location" aria-labelledby="location-title"><h2 id="location-title">${e(text.location)}</h2><p><strong>${e(g.location.label)}</strong> · ${e(text.coordinates)}: ${g.location.lat}, ${g.location.lon}</p><p><a class="link" href="${osmUrl(g.location)}" rel="noopener">${e(text.open_map)} ${ICON('arrow')}</a></p></section>`
      : '';
  const figure = g.photo && photos[g.photo]
    ? `<figure class="guide-photo">${photoImg(g.photo, g.lang, { eager: true, sizes: '(min-width: 800px) 760px, 100vw' })}<figcaption>${creditLine(g.photo, g.lang)}</figcaption></figure>`
    : '';
  const mapBlock = g.map
    ? `<section class="map-block" aria-labelledby="map-title"><h2 id="map-title">${e(text.map_title)}</h2>` +
      `<div class="map" data-map="${esc(JSON.stringify({ line: g.map.line !== false, stops: g.map.stops }))}">` +
      `<div class="map__facade"><p>${e(text.map_note)}</p><button class="btn btn--primary" type="button" data-map-load>${e(text.map_button)}</button></div>` +
      `<div class="map__canvas" role="region" aria-label="${e(text.map_title)}" hidden></div></div>` +
      `<p class="map__hint">${e(text.map_hint)}</p>` +
      `<ol class="map__legend" aria-label="${e(text.stops)}">${g.map.stops
        .map((st, i) => `<li><span class="map__num">${i + 1}</span>${e(st.name)}${st.day ? ` <small>${e(text.day.replace('{n}', st.day))}</small>` : ''}</li>`)
        .join('')}</ol></section>`
    : '';
  const faq = g.faq.map((f) => `<details><summary>${e(f.q)}</summary><p>${e(f.a)}</p></details>`).join('');
  const sources = g.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${e(s.title)}</a></li>`).join('');

  return `${head(text, `${g.title} — LimeTravel`, g.description, g.map ? '<script src="/assets/js/map.js" defer></script>' : '', ld)}
<main id="permbajtja" class="page">
  <article class="post guide container container--narrow">
    <nav class="crumbs" aria-label="${e(text.breadcrumb)}"><ol>
      <li><a href="{{HOME}}">LimeTravel</a></li>
      <li><a href="${sectionUrl(g.lang, g.kind)}">${e(text[g.kind].eyebrow)}</a></li>
      <li aria-current="page">${e(g.name)}</li>
    </ol></nav>
    <header class="post__head">
      <p class="eyebrow">${e(kindLabel)} · ${e(g.region)}</p>
      <h1 class="display display--sm">${e(g.title)}</h1>
    </header>
    ${figure}
    <aside class="summary" aria-labelledby="summary-title"><h2 id="summary-title">${e(text.summary)}</h2><p>${e(g.summary)}</p></aside>
    ${facts}
    ${toc}
    <div class="post__body">
${g.html}
    </div>
    ${itinerary}
    ${mapBlock}
    ${location}
    <section class="post__faq faq" aria-labelledby="faq-title"><h2 id="faq-title">${e(text.faq)}</h2>${faq}</section>
    <section class="post__sources" aria-labelledby="sources-title"><h2 id="sources-title">${e(text.sources)}</h2><ul>${sources}</ul>
      <p class="post__note">${e(text.reviewed)} <time datetime="${g.reviewed}">${e(formatDate(g.reviewed, g.lang))}</time>. ${e(text.sources_note)}</p></section>
    <aside class="cta-box"><h2>${e(text.cta_title)}</h2><p>${e(text.cta_text)}</p>
      <div class="hero__cta">
        {{#WHATSAPP}}<a class="btn btn--primary" href="https://wa.me/{{WHATSAPP}}?text=${waText}" rel="noopener" target="_blank">${ICON('whatsapp')}${e(text.cta_button)}</a>{{/WHATSAPP}}
        <a class="btn btn--ghost" href="{{HOME}}#kerkese">${e(text.cta_form)}</a>
      </div></aside>
    ${related.length ? `<section class="post__related" aria-labelledby="related-title"><h2 id="related-title">${e(text.related)}</h2><div class="cards">${related.map((r) => card(r, text)).join('')}</div></section>` : ''}
  </article>
</main>
{{> footer}}
</body>
</html>`;
}

const ogImage = (g) => (g.photo && photos[g.photo] ? `/assets/img/places/${g.photo}-og.jpg` : null);

module.exports = { creditLine, photoSrc, photoImg, photos, ogImage, GUIDE_LANGS, KINDS, ui, loadGuides, isPublished, validateGuides, sectionUrl, guideUrl, latestSection, indexSource, guideSource };
