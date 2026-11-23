'use strict';

// LimeTravel — server statik pa varësi të jashtme, gati për Railway.
// Faqet ndërtohen një herë në nisje, për çdo gjuhë, nga pages/ + partials/ + locales/.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const blog = require('./lib/blog');

const PUBLIC_DIR = path.join(__dirname, 'public');
const PAGES_DIR = path.join(__dirname, 'pages');
const PARTIALS_DIR = path.join(__dirname, 'partials');
const LOCALES_DIR = path.join(__dirname, 'locales');

const DEFAULT_LANG = 'sq';
// Gjuhët që ndërtohen janë ato që kanë skedar locales/<kodi>.json.
const LANGS = [
  { code: 'sq', name: 'Shqip', og: 'sq_AL' },
  { code: 'en', name: 'English', og: 'en_GB' },
  { code: 'it', name: 'Italiano', og: 'it_IT' },
  { code: 'de', name: 'Deutsch', og: 'de_DE' },
  { code: 'el', name: 'Ελληνικά', og: 'el_GR' },
];
const PAGES = [
  { id: 'home', file: 'index.html' },
  {
    id: 'doctrine',
    file: 'doktrina.html',
    slug: { sq: 'doktrina', en: 'doctrine', it: 'dottrina', de: 'grundsaetze', el: 'doctrine' },
  },
  {
    id: 'privacy',
    file: 'privatesia.html',
    slug: { sq: 'privatesia', en: 'privacy', it: 'privacy', de: 'datenschutz', el: 'privacy' },
  },
  { id: 'notfound', file: '404.html' },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};
const TEMPLATED = new Set(['.html', '.xml', '.txt']);
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.svg', '.xml', '.txt', '.webmanifest']);

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; " +
    "connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readConfig(env = process.env) {
  const clean = (v) => (v || '').trim();
  // Numri zyrtar i WhatsApp-it. Mund të ndryshohet me WHATSAPP_NUMBER; vlera bosh e çaktivizon.
  const DEFAULT_WHATSAPP = '355695397514';
  const DEFAULT_PHONE_DISPLAY = '+355 69 539 7514';
  const whatsapp = env.WHATSAPP_NUMBER === undefined ? DEFAULT_WHATSAPP : clean(env.WHATSAPP_NUMBER).replace(/\D/g, '');
  return {
    SITE_URL: (clean(env.SITE_URL) || 'https://www.limetravel.al').replace(/\/+$/, ''),
    INSTAGRAM: (clean(env.INSTAGRAM_HANDLE) || 'limetravel.al').replace(/^@/, ''),
    LINKEDIN: clean(env.LINKEDIN_URL) || 'https://www.linkedin.com/company/limetravel-al',
    WHATSAPP: whatsapp,
    NO_WHATSAPP: whatsapp ? '' : '1',
    PHONE_TEL: whatsapp ? '+' + whatsapp : '',
    PHONE_DISPLAY: whatsapp === DEFAULT_WHATSAPP ? DEFAULT_PHONE_DISPLAY : whatsapp ? '+' + whatsapp : '',
    EMAIL: env.CONTACT_EMAIL === undefined ? 'info@limetravel.al' : clean(env.CONTACT_EMAIL),
    YEAR: String(new Date().getFullYear()),
  };
}

function translate(dict, key) {
  if (!(key in dict)) throw new Error(`Mungon përkthimi për çelësin "${key}"`);
  return dict[key];
}

// {{> partial}}, {{t:çelës}} (HTML), {{a:çelës}} (atribut), {{#KEY}}…{{/KEY}}, {{&RAW}}, {{ESCAPED}}
function render(source, config, partials, dict = {}) {
  let out = source.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => partials[name] || '');
  for (let i = 0; i < 5 && /\{\{[ta]:/.test(out); i++) {
    out = out
      .replace(/\{\{t:([\w.-]+)\}\}/g, (_, key) => translate(dict, key))
      .replace(/\{\{a:([\w.-]+)\}\}/g, (_, key) => escapeHtml(translate(dict, key)));
  }
  return out
    .replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, body) => (config[key] ? body : ''))
    .replace(/\{\{&(\w+)\}\}/g, (match, key) => (key in config ? String(config[key]) : match))
    .replace(/\{\{(\w+)\}\}/g, (match, key) => (key in config ? escapeHtml(config[key]) : match));
}

function cachePolicy(urlPath, ext) {
  if (urlPath.startsWith('/assets/fonts/')) return 'public, max-age=31536000, immutable';
  if (urlPath.startsWith('/assets/img/') || ext === '.ico') return 'public, max-age=604800';
  if (ext === '.css' || ext === '.js') return 'public, max-age=3600, must-revalidate';
  return 'public, max-age=0, must-revalidate';
}

function makeAsset(urlPath, body, ext) {
  const asset = {
    body,
    type: MIME[ext],
    cache: cachePolicy(urlPath, ext),
    etag: '"' + crypto.createHash('sha1').update(body).digest('base64url').slice(0, 20) + '"',
  };
  if (COMPRESSIBLE.has(ext) && body.length > 512) {
    asset.br = zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } });
    asset.gzip = zlib.gzipSync(body, { level: 9 });
  }
  return asset;
}

// ---------- Rrugët e faqeve sipas gjuhës ----------

function pageUrl(lang, pageId) {
  const prefix = lang.code === DEFAULT_LANG ? '' : '/' + lang.code;
  if (pageId === 'home') return prefix + '/';
  if (pageId === 'notfound') return prefix + '/404';
  const page = PAGES.find((p) => p.id === pageId);
  return `${prefix}/${page.slug[lang.code]}`;
}

const urlToFile = (url) => (url.endsWith('/') ? url + 'index.html' : url + '.html');

function languageMenu(items, current, dict) {
  if (items.length < 2) return '';
  const links = items
    .map(({ lang, href }) => {
      const here = lang.code === current.code ? ' aria-current="true"' : '';
      return `<li><a href="${href}" hreflang="${lang.code}" lang="${lang.code}"${here}>${escapeHtml(lang.name)}</a></li>`;
    })
    .join('');
  return (
    `<details class="lang" data-lang><summary aria-label="${escapeHtml(translate(dict, 'ui.language'))}">` +
    '<svg class="icon" aria-hidden="true"><use href="/assets/img/icons.svg#globe"/></svg>' +
    `<span>${current.code.toUpperCase()}</span></summary><ul>${links}</ul></details>`
  );
}

// list: [{ code, url }] — lidhjet hreflang (me x-default) të një faqeje dhe versioneve të saj
function alternateLinks(list, siteUrl, fallbackCode) {
  if (list.length < 2) return '';
  const links = list.map((a) => `<link rel="alternate" hreflang="${a.code}" href="${siteUrl}${a.url}">`);
  const fallback = list.find((a) => a.code === fallbackCode) || list[0];
  links.push(`<link rel="alternate" hreflang="x-default" href="${siteUrl}${fallback.url}">`);
  return links.join('\n  ');
}

function sitemapEntry(siteUrl, list, self, fallbackCode, lastmod) {
  const alts =
    list.length < 2
      ? ''
      : list.map((a) => `<xhtml:link rel="alternate" hreflang="${a.code}" href="${siteUrl}${a.url}"/>`).join('') +
        `<xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}${(list.find((a) => a.code === fallbackCode) || list[0]).url}"/>`;
  return `  <url><loc>${siteUrl}${self}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}${alts}</url>`;
}

function sitemapXml(entries) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    entries.join('\n') +
    '\n</urlset>\n'
  );
}

// Ngarkon çdo skedar në memorie një herë: i renderuar, i kompresuar dhe me ETag.
function buildSite(config = readConfig()) {
  const partials = {};
  for (const file of fs.readdirSync(PARTIALS_DIR)) {
    partials[path.basename(file, '.html')] = fs.readFileSync(path.join(PARTIALS_DIR, file), 'utf8');
  }
  const readLocale = (code) => JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${code}.json`), 'utf8'));
  const base = readLocale(DEFAULT_LANG);
  const active = LANGS.filter((l) => fs.existsSync(path.join(LOCALES_DIR, `${l.code}.json`)));

  const files = new Map();

  // Skedarët statikë (fonte, imazhe, CSS, JS, robots…)
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!MIME[ext]) continue;
      const urlPath = '/' + path.relative(PUBLIC_DIR, full).split(path.sep).join('/');
      let body = fs.readFileSync(full);
      if (TEMPLATED.has(ext)) body = Buffer.from(render(body.toString('utf8'), config, partials));
      files.set(urlPath, makeAsset(urlPath, body, ext));
    }
  };
  walk(PUBLIC_DIR);

  // Blogu: vetëm artikujt e publikuar, në gjuhët që kanë faqe të përkthyera
  const posts = blog.loadPosts().filter((p) => blog.isPublished(p));
  const blogLangs = active.filter((l) => blog.BLOG_LANGS.includes(l.code));
  const blogFallback = blogLangs.find((l) => l.code === 'en') || blogLangs[0];

  const dicts = {};
  for (const lang of active) dicts[lang.code] = { ...base, ...(lang.code === DEFAULT_LANG ? {} : readLocale(lang.code)) };

  const contextFor = (lang, url, extra = {}) => {
    const dict = dicts[lang.code];
    const js = Object.fromEntries(
      Object.entries(dict)
        .filter(([key]) => key.startsWith('js.'))
        .map(([key, value]) => [key.slice(3), value])
    );
    const ownBlog = blogLangs.find((l) => l.code === lang.code);
    return {
      ...config,
      LANG: lang.code,
      OG_LOCALE: lang.og,
      OG_TYPE: 'website',
      HOME: pageUrl(lang, 'home'),
      P_DOCTRINE: pageUrl(lang, 'doctrine'),
      P_PRIVACY: pageUrl(lang, 'privacy'),
      P_BLOG: blogFallback ? blog.blogIndexUrl((ownBlog || blogFallback).code) : '/',
      BLOG_LATEST: ownBlog ? blog.latestSection(lang.code, posts, config.SITE_URL) : '',
      CANONICAL: config.SITE_URL + url,
      WA_TEXT: encodeURIComponent(dict['js.greeting']),
      STRINGS_JSON: JSON.stringify(js),
      ...extra,
    };
  };
  const addPage = (url, source, ctx, dict) => {
    const file = urlToFile(url);
    files.set(file, makeAsset(file, Buffer.from(render(source, ctx, partials, dict)), '.html'));
  };

  for (const lang of active) {
    const dict = dicts[lang.code];
    for (const page of PAGES) {
      const url = pageUrl(lang, page.id);
      const target = page.id === 'notfound' ? 'home' : page.id;
      const ctx = contextFor(lang, url, {
        HREFLANG:
          page.id === 'notfound'
            ? ''
            : alternateLinks(active.map((l) => ({ code: l.code, url: pageUrl(l, page.id) })), config.SITE_URL, DEFAULT_LANG),
        LANG_MENU: languageMenu(active.map((l) => ({ lang: l, href: pageUrl(l, target) })), lang, dict),
      });
      addPage(url, fs.readFileSync(path.join(PAGES_DIR, page.file), 'utf8'), ctx, dict);
    }
  }

  for (const lang of blogLangs) {
    const dict = dicts[lang.code];
    const indexUrl = blog.blogIndexUrl(lang.code);
    addPage(
      indexUrl,
      blog.indexSource(lang.code, posts, config.SITE_URL),
      contextFor(lang, indexUrl, {
        HREFLANG: alternateLinks(blogLangs.map((l) => ({ code: l.code, url: blog.blogIndexUrl(l.code) })), config.SITE_URL, DEFAULT_LANG),
        LANG_MENU: languageMenu(blogLangs.map((l) => ({ lang: l, href: blog.blogIndexUrl(l.code) })), lang, dict),
      }),
      dict
    );
    const feed = blog.feedUrl(lang.code);
    files.set(feed, makeAsset(feed, Buffer.from(blog.feedXml(lang.code, posts, config.SITE_URL)), '.xml'));

    for (const post of posts.filter((p) => p.lang === lang.code)) {
      const versions = blogLangs.map((l) => ({ lang: l, post: posts.find((p) => p.id === post.id && p.lang === l.code) }));
      const url = blog.postUrl(post);
      addPage(
        url,
        blog.postSource(post, posts, config.SITE_URL),
        contextFor(lang, url, {
          OG_TYPE: 'article',
          HREFLANG: alternateLinks(
            versions.filter((v) => v.post).map((v) => ({ code: v.lang.code, url: blog.postUrl(v.post) })),
            config.SITE_URL,
            DEFAULT_LANG
          ),
          LANG_MENU: languageMenu(
            versions.map((v) => ({ lang: v.lang, href: v.post ? blog.postUrl(v.post) : blog.blogIndexUrl(v.lang.code) })),
            lang,
            dict
          ),
        }),
        dict
      );
    }
  }

  // Sitemap: faqet, blogu dhe artikujt, me alternativat hreflang
  const entries = [];
  for (const page of PAGES.filter((p) => p.id !== 'notfound')) {
    const list = active.map((l) => ({ code: l.code, url: pageUrl(l, page.id) }));
    for (const a of list) entries.push(sitemapEntry(config.SITE_URL, list, a.url, DEFAULT_LANG));
  }
  const indexList = blogLangs.map((l) => ({ code: l.code, url: blog.blogIndexUrl(l.code) }));
  for (const a of indexList) entries.push(sitemapEntry(config.SITE_URL, indexList, a.url, DEFAULT_LANG, posts.find((p) => p.lang === a.code)?.updated));
  for (const post of posts) {
    const list = blogLangs
      .map((l) => ({ code: l.code, post: posts.find((p) => p.id === post.id && p.lang === l.code) }))
      .filter((v) => v.post)
      .map((v) => ({ code: v.code, url: blog.postUrl(v.post) }));
    entries.push(sitemapEntry(config.SITE_URL, list, blog.postUrl(post), DEFAULT_LANG, post.updated));
  }
  files.set('/sitemap.xml', makeAsset('/sitemap.xml', Buffer.from(sitemapXml(entries)), '.xml'));
  return files;
}

function resolveAsset(files, pathname) {
  if (pathname.endsWith('.html')) return undefined; // vetëm URL të pastra
  if (pathname.endsWith('/')) return files.get(pathname + 'index.html');
  return files.get(pathname) || files.get(pathname + '.html');
}

function createHandler(files) {
  return (req, res) => {
    const send = (status, asset, extra = {}) => {
      const headers = { ...SECURITY_HEADERS, ...extra };
      let body = asset.body;
      if (asset.type) headers['Content-Type'] = asset.type;
      if (asset.cache) headers['Cache-Control'] = asset.cache;
      if (asset.etag) headers.ETag = asset.etag;
      if (asset.br || asset.gzip) {
        headers.Vary = 'Accept-Encoding';
        const accepts = String(req.headers['accept-encoding'] || '');
        if (asset.br && /\bbr\b/.test(accepts)) {
          body = asset.br;
          headers['Content-Encoding'] = 'br';
        } else if (asset.gzip && /\bgzip\b/.test(accepts)) {
          body = asset.gzip;
          headers['Content-Encoding'] = 'gzip';
        }
      }
      headers['Content-Length'] = body.length;
      res.writeHead(status, headers);
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    const text = (status, message, extra) =>
      send(status, { body: Buffer.from(message), type: MIME['.txt'], cache: 'no-store' }, extra);

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return text(405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      return text(400, 'Bad Request');
    }

    if (pathname === '/healthz') return text(200, 'ok');

    // URL kanonike: /doktrina/ → /doktrina, /doktrina.html → /doktrina, /index.html → /, /en → /en/
    let canonical = pathname.replace(/\/{2,}/g, '/');
    if (canonical.endsWith('.html')) canonical = canonical.slice(0, -5);
    if (canonical.endsWith('/index')) canonical = canonical.slice(0, -5);
    if (!canonical.endsWith('/') && files.has(canonical + '/index.html')) {
      canonical += '/';
    } else if (canonical.length > 1 && canonical.endsWith('/') && !files.has(canonical + 'index.html')) {
      canonical = canonical.slice(0, -1);
    }
    if (canonical !== pathname && resolveAsset(files, canonical)) {
      const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      res.writeHead(301, { ...SECURITY_HEADERS, Location: canonical + query, 'Content-Length': 0 });
      return res.end();
    }

    const asset = /(^|\/)404$/.test(pathname) ? undefined : resolveAsset(files, pathname);
    if (!asset) {
      const lang = pathname.match(/^\/([a-z]{2})(?:\/|$)/);
      const notFound = (lang && files.get(`/${lang[1]}/404.html`)) || files.get('/404.html');
      return send(404, { ...notFound, cache: 'no-store', etag: undefined });
    }
    if (req.headers['if-none-match'] === asset.etag) {
      res.writeHead(304, { ...SECURITY_HEADERS, ETag: asset.etag, 'Cache-Control': asset.cache });
      return res.end();
    }
    return send(200, asset);
  };
}

function start() {
  const files = buildSite();
  const port = Number(process.env.PORT) || 3000;
  const server = http.createServer(createHandler(files));
  server.listen(port, '0.0.0.0', () => {
    console.log(`LimeTravel po dëgjon në portën ${port} (${files.size} skedarë)`);
  });
  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  return server;
}

if (require.main === module) start();

module.exports = { buildSite, createHandler, readConfig, render, pageUrl, LANGS, PAGES };
