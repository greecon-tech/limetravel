'use strict';

// Blogu i LimeTravel: artikuj në content/blog/<id>.<gjuha>.md
// Formati: front matter JSON mes dy rreshtave `---`, pastaj trupi në Markdown të thjeshtë.
const fs = require('node:fs');
const path = require('node:path');

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const POSTS_DIR = path.join(CONTENT_DIR, 'blog');
const BLOG_LANGS = ['sq', 'en'];
const DATE_LOCALE = { sq: 'sq-AL', en: 'en-GB' };

const ui = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'blog-ui.json'), 'utf8'));

// ---------- Ndihmës ----------

const esc = (v) =>
  String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
// Shabllonet përdorin {{…}}: asnjë përmbajtje artikulli nuk duhet të krijojë shenja të tilla.
const safe = (html) => html.replace(/\{\{/g, '&#123;&#123;');
const e = (v) => safe(esc(v));
const json = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c').replace(/\{\{/g, '{\\u007b');
const slugify = (t) =>
  t.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const plain = (t) => t.replace(/\*\*|`|\*/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

function formatDate(iso, lang) {
  try {
    return new Date(iso + 'T00:00:00Z').toLocaleDateString(DATE_LOCALE[lang] || 'en-GB', {
      timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ---------- Markdown i thjeshtë ----------

function inline(text) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
    if (/^https?:\/\//.test(url)) return `<a href="${url}" rel="noopener">${label}</a>`;
    if (/^(\/|#|mailto:)/.test(url)) return `<a href="${url}">${label}</a>`;
    return label;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s;
}

function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const headings = [];
  const used = new Set();
  const uniqueId = (text) => {
    const base = slugify(text) || 'seksion';
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return id;
  };
  const isBlockStart = (l) => /^(#{1,3}\s|\s*[-*]\s+|\s*\d+\.\s+|>|\|)/.test(l) || /^---+\s*$/.test(l);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      const level = m[1].length;
      if (level === 1) throw new Error('H1 nuk lejohet në trup (titulli vjen nga front matter)');
      const text = m[2].trim();
      const id = uniqueId(plain(text));
      if (level === 2) headings.push({ id, text: plain(text) });
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++;
    } else if (/^---+\s*$/.test(line)) {
      out.push('<hr>');
      i++;
    } else if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(`<li>${inline(lines[i++].replace(/^\s*[-*]\s+/, ''))}</li>`);
      out.push(`<ul>${items.join('')}</ul>`);
    } else if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(`<li>${inline(lines[i++].replace(/^\s*\d+\.\s+/, ''))}</li>`);
      out.push(`<ol>${items.join('')}</ol>`);
    } else if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, '').trim());
      out.push(`<blockquote><p>${inline(buf.join(' '))}</p></blockquote>`);
    } else if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (rows.length < 3 || !/^\|?\s*:?-{2,}/.test(rows[1])) throw new Error('Tabela duhet të ketë kokë dhe rresht ndarës (|---|---|)');
      const head = cells(rows[0]).map((c) => `<th scope="col">${inline(c)}</th>`).join('');
      const body = rows.slice(2).map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('');
      out.push(`<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`);
    } else {
      const buf = [];
      while (i < lines.length && lines[i].trim() && !(buf.length && isBlockStart(lines[i]))) buf.push(lines[i++].trim());
      out.push(`<p>${inline(buf.join(' '))}</p>`);
    }
  }
  return { html: safe(out.join('\n')), headings };
}

// ---------- Ngarkimi dhe validimi ----------

function parsePost(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${path.basename(file)}: mungon front matter`);
  let meta;
  try {
    meta = JSON.parse(m[1]);
  } catch (error) {
    throw new Error(`${path.basename(file)}: front matter JSON i pavlefshëm — ${error.message}`);
  }
  const body = m[2].trim();
  const { html, headings } = markdownToHtml(body);
  const words = plain(body).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  return { ...meta, body, html, headings, words, readMinutes: Math.max(1, Math.round(words / 200)), file: path.basename(file) };
}

function loadPosts(dir = POSTS_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => parsePost(path.join(dir, f)))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id.localeCompare(b.id)));
}

const today = () => new Date().toISOString().slice(0, 10);
const isPublished = (post, now = today()) => !post.draft && post.date <= now;

function validatePosts(posts, now = today()) {
  const problems = [];
  const add = (post, msg) => problems.push(`${post.file}: ${msg}`);
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  const seen = new Set();
  const slugs = new Set();

  for (const p of posts) {
    if (!kebab.test(p.id || '')) add(p, 'id duhet të jetë në formën kebab-case');
    if (!BLOG_LANGS.includes(p.lang)) add(p, `lang duhet të jetë një nga ${BLOG_LANGS.join(', ')}`);
    if (p.file !== `${p.id}.${p.lang}.md`) add(p, `emri i skedarit duhet të jetë ${p.id}.${p.lang}.md`);
    if (!kebab.test(p.slug || '')) add(p, 'slug duhet të jetë ASCII kebab-case');
    if (!p.title || p.title.length > 65) add(p, 'titulli mungon ose është mbi 65 shkronja');
    if (!p.description || p.description.length < 110 || p.description.length > 160) add(p, `description duhet 110–160 shkronja (tani ${(p.description || '').length})`);
    if (!p.summary || p.summary.length < 60 || p.summary.length > 420) add(p, 'summary (përgjigjja e shkurtër) duhet 60–420 shkronja');
    for (const field of ['date', 'updated', 'reviewed']) if (!dateRe.test(p[field] || '')) add(p, `${field} duhet YYYY-MM-DD`);
    if (dateRe.test(p.date || '') && dateRe.test(p.updated || '') && p.updated < p.date) add(p, 'updated është para date');
    if (!Array.isArray(p.tags) || p.tags.length < 2 || p.tags.length > 6) add(p, 'tags duhet 2–6 etiketa');
    if (!Array.isArray(p.faq) || p.faq.length < 3) add(p, 'faq duhet të ketë të paktën 3 pyetje');
    else for (const f of p.faq) if (!f.q || !f.a || f.a.length > 700 || /[*`[\]]/.test(f.a)) add(p, `faq e pavlefshme: "${(f.q || '').slice(0, 40)}" (tekst i thjeshtë, përgjigje ≤700)`);
    if (!Array.isArray(p.sources) || p.sources.length < 2) add(p, 'sources duhet të ketë të paktën 2 burime');
    else for (const s of p.sources) if (!s.title || !/^https:\/\//.test(s.url || '')) add(p, `burim i pavlefshëm: ${JSON.stringify(s).slice(0, 60)}`);
    if (p.words < 600) add(p, `trupi është shumë i shkurtër (${p.words} fjalë, minimumi 600)`);
    if (p.headings.length < 3) add(p, 'duhen të paktën 3 tituj H2');
    for (const [, url] of p.body.matchAll(/\]\(([^)\s]+)\)/g)) if (!/^(https:\/\/|\/|#|mailto:)/.test(url)) add(p, `lidhje e pasigurt ose e gabuar: ${url}`);
    if (!/\d{4}/.test(p.body) && p.reviewed) add(p, 'trupi nuk përmend asnjë vit/datë — shtoni datën e verifikimit');
    const key = `${p.id}.${p.lang}`;
    if (seen.has(key)) add(p, `dublikatë id+lang ${key}`);
    seen.add(key);
    const slugKey = `${p.lang}/${p.slug}`;
    if (slugs.has(slugKey)) add(p, `slug i dublikuar ${slugKey}`);
    slugs.add(slugKey);
    if (p.date > now && !p.draft) add(p, 'ka datë në të ardhmen; do të fshihet deri atëherë (vetëm informim)');
  }
  const ids = [...new Set(posts.map((p) => p.id))];
  for (const id of ids) {
    for (const lang of BLOG_LANGS) {
      if (!posts.some((p) => p.id === id && p.lang === lang)) problems.push(`${id}: mungon versioni ${lang}`);
    }
  }
  return problems.filter((m) => !m.endsWith('(vetëm informim)'));
}

// ---------- URL ----------

const blogIndexUrl = (lang) => (lang === 'sq' ? '/blog/' : `/${lang}/blog/`);
const postUrl = (post) => blogIndexUrl(post.lang) + post.slug;
const feedUrl = (lang) => blogIndexUrl(lang) + 'feed.xml';

// ---------- HTML ----------

const ICON = (name) => `<svg class="icon" aria-hidden="true"><use href="/assets/img/icons.svg#${name}"/></svg>`;

function card(post, text) {
  return (
    `<article class="card"><a class="card__link" href="${postUrl(post)}">` +
    `<p class="card__meta"><time datetime="${post.date}">${e(formatDate(post.date, post.lang))}</time> · ${e(text.read_min.replace('{n}', post.readMinutes))}</p>` +
    `<h3>${e(post.title)}</h3><p>${e(post.description)}</p>` +
    `<span class="link">${e(text.read_more)} ${ICON('arrow')}</span></a></article>`
  );
}

function latestSection(lang, posts, siteUrl) {
  const text = ui[lang];
  const list = posts.filter((p) => p.lang === lang).slice(0, 3);
  if (!text || !list.length) return '';
  return (
    `<section class="section section--tint" aria-labelledby="blog-latest-title"><div class="container">` +
    `<div class="section__head reveal"><p class="eyebrow">${e(text.latest_eyebrow)}</p>` +
    `<h2 id="blog-latest-title">${e(text.latest_title)}</h2></div>` +
    `<div class="cards">${list.map((p) => card(p, text)).join('')}</div>` +
    `<p class="cards__all"><a class="link" href="${blogIndexUrl(lang)}">${e(text.all_posts)} ${ICON('arrow')}</a></p>` +
    `</div></section>`
  );
}

function indexSource(lang, posts, siteUrl) {
  const text = ui[lang];
  const list = posts.filter((p) => p.lang === lang);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: text.feed_title,
    description: text.index_description,
    inLanguage: lang,
    url: siteUrl + blogIndexUrl(lang),
    publisher: { '@type': 'Organization', name: 'LimeTravel', url: siteUrl + '/' },
    blogPost: list.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: siteUrl + postUrl(p), datePublished: p.date, dateModified: p.updated })),
  };
  return `<!doctype html>
<html lang="{{LANG}}">
<head>
  <meta charset="utf-8">
  <title>${e(text.index_title)}</title>
  <meta name="description" content="${e(text.index_description)}">
  <link rel="canonical" href="{{CANONICAL}}">
  {{&HREFLANG}}
  <link rel="alternate" type="application/rss+xml" title="${e(text.feed_title)}" href="${feedUrl(lang)}">
  <meta property="og:title" content="${e(text.index_title)}">
  <meta property="og:description" content="${e(text.index_description)}">
  <meta property="og:url" content="{{CANONICAL}}">
  {{> head}}
  <script type="application/ld+json">${json(ld)}</script>
</head>
<body>
{{> header}}
<main id="permbajtja" class="page">
  <header class="page__head container container--narrow">
    <p class="eyebrow">${e(text.blog)}</p>
    <h1 class="display display--sm">${e(text.index_h1)}</h1>
    <p class="lead">${e(text.index_lead)}</p>
  </header>
  <section class="container blog-list">
    ${list.length ? `<div class="cards">${list.map((p) => card(p, text)).join('')}</div>` : `<p class="lead">${e(text.no_posts)}</p>`}
  </section>
</main>
{{> footer}}
</body>
</html>`;
}

function postSource(post, posts, siteUrl) {
  const text = ui[post.lang];
  const url = siteUrl + postUrl(post);
  const waText = encodeURIComponent(text.wa_text.replace('{title}', post.title));
  const related = posts.filter((p) => p.lang === post.lang && p.id !== post.id).slice(0, 2);
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description,
        inLanguage: post.lang,
        datePublished: post.date,
        dateModified: post.updated,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        image: [siteUrl + '/assets/img/og.jpg'],
        author: { '@type': 'Organization', name: 'LimeTravel', url: siteUrl + '/' },
        publisher: { '@type': 'Organization', name: 'LimeTravel', logo: { '@type': 'ImageObject', url: siteUrl + '/assets/img/icon-512.png' } },
        keywords: post.tags.join(', '),
        wordCount: post.words,
        citation: post.sources.map((s) => s.url),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'LimeTravel', item: siteUrl + (post.lang === 'sq' ? '/' : `/${post.lang}/`) },
          { '@type': 'ListItem', position: 2, name: text.blog, item: siteUrl + blogIndexUrl(post.lang) },
          { '@type': 'ListItem', position: 3, name: post.title, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: post.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };
  const toc =
    post.headings.length >= 3
      ? `<nav class="toc" aria-label="${e(text.contents)}"><h2>${e(text.contents)}</h2><ol>${post.headings
          .map((h) => `<li><a href="#${h.id}">${e(h.text)}</a></li>`)
          .join('')}</ol></nav>`
      : '';
  const faq = post.faq
    .map((f) => `<details><summary>${e(f.q)}</summary><p>${e(f.a)}</p></details>`)
    .join('');
  const sources = post.sources
    .map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${e(s.title)}</a></li>`)
    .join('');
  const modified = post.updated !== post.date ? ` · ${e(text.updated)} <time datetime="${post.updated}">${e(formatDate(post.updated, post.lang))}</time>` : '';

  return `<!doctype html>
<html lang="{{LANG}}">
<head>
  <meta charset="utf-8">
  <title>${e(post.title)} — LimeTravel</title>
  <meta name="description" content="${e(post.description)}">
  <link rel="canonical" href="{{CANONICAL}}">
  {{&HREFLANG}}
  <link rel="alternate" type="application/rss+xml" title="${e(text.feed_title)}" href="${feedUrl(post.lang)}">
  <meta property="og:title" content="${e(post.title)}">
  <meta property="og:description" content="${e(post.description)}">
  <meta property="og:url" content="{{CANONICAL}}">
  <meta property="article:published_time" content="${post.date}">
  <meta property="article:modified_time" content="${post.updated}">
  ${post.tags.map((t) => `<meta property="article:tag" content="${e(t)}">`).join('\n  ')}
  {{> head}}
  <script type="application/ld+json">${json(ld)}</script>
</head>
<body>
{{> header}}
<main id="permbajtja" class="page">
  <article class="post container container--narrow">
    <nav class="crumbs" aria-label="${e(text.breadcrumb)}"><ol>
      <li><a href="{{HOME}}">LimeTravel</a></li>
      <li><a href="${blogIndexUrl(post.lang)}">${e(text.blog)}</a></li>
      <li aria-current="page">${e(post.title)}</li>
    </ol></nav>
    <header class="post__head">
      <p class="eyebrow">${e(post.tags[0])}</p>
      <h1 class="display display--sm">${e(post.title)}</h1>
      <p class="post__meta">${e(text.by)} · <time datetime="${post.date}">${e(formatDate(post.date, post.lang))}</time>${modified} · ${e(text.read_min.replace('{n}', post.readMinutes))}</p>
    </header>
    <aside class="summary" aria-labelledby="summary-title"><h2 id="summary-title">${e(text.summary)}</h2><p>${e(post.summary)}</p></aside>
    ${toc}
    <div class="post__body">
${post.html}
    </div>
    <section class="post__faq faq" aria-labelledby="faq-title"><h2 id="faq-title">${e(text.faq)}</h2>${faq}</section>
    <section class="post__sources" aria-labelledby="sources-title"><h2 id="sources-title">${e(text.sources)}</h2><ul>${sources}</ul>
      <p class="post__note">${e(text.reviewed)} <time datetime="${post.reviewed}">${e(formatDate(post.reviewed, post.lang))}</time>. ${e(text.sources_note)}</p></section>
    <aside class="cta-box"><h2>${e(text.cta_title)}</h2><p>${e(text.cta_text)}</p>
      <div class="hero__cta">
        {{#WHATSAPP}}<a class="btn btn--primary" href="https://wa.me/{{WHATSAPP}}?text=${waText}" rel="noopener" target="_blank">${ICON('whatsapp')}${e(text.cta_button)}</a>{{/WHATSAPP}}
        <a class="btn btn--ghost" href="{{HOME}}#kerkese">${e(text.cta_form)}</a>
      </div></aside>
    ${related.length ? `<section class="post__related" aria-labelledby="related-title"><h2 id="related-title">${e(text.related)}</h2><div class="cards">${related.map((p) => card(p, text)).join('')}</div></section>` : ''}
  </article>
</main>
{{> footer}}
</body>
</html>`;
}

function feedXml(lang, posts, siteUrl) {
  const text = ui[lang];
  const list = posts.filter((p) => p.lang === lang);
  const x = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const items = list
    .map(
      (p) =>
        `    <item><title>${x(p.title)}</title><link>${siteUrl}${postUrl(p)}</link><guid isPermaLink="true">${siteUrl}${postUrl(p)}</guid>` +
        `<pubDate>${new Date(p.date + 'T08:00:00Z').toUTCString()}</pubDate><description>${x(p.description)}</description>` +
        p.tags.map((t) => `<category>${x(t)}</category>`).join('') +
        `</item>`
    )
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n' +
    `  <title>${x(text.feed_title)}</title>\n  <link>${siteUrl}${blogIndexUrl(lang)}</link>\n  <description>${x(text.index_description)}</description>\n` +
    `  <language>${lang}</language>\n  <atom:link href="${siteUrl}${feedUrl(lang)}" rel="self" type="application/rss+xml"/>\n${items}\n</channel>\n</rss>\n`
  );
}

module.exports = {
  esc,
  e,
  safe,
  json,
  plain,
  formatDate,
  ICON,
  BLOG_LANGS,
  ui,
  markdownToHtml,
  parsePost,
  loadPosts,
  isPublished,
  validatePosts,
  blogIndexUrl,
  postUrl,
  feedUrl,
  latestSection,
  indexSource,
  postSource,
  feedXml,
};
