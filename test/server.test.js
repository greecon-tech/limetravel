'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { buildSite, createHandler, readConfig, render } = require('../server');

function listen(env) {
  const server = http.createServer(createHandler(buildSite(readConfig(env))));
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}
const get = (server, path, headers = {}) =>
  fetch(`http://127.0.0.1:${server.address().port}${path}`, { headers, redirect: 'manual' });

test('faqet kryesore përgjigjen me 200 dhe pa placeholder të mbetur', async (t) => {
  const server = await listen({});
  t.after(() => server.close());
  for (const path of ['/', '/doktrina', '/privatesia', '/robots.txt', '/sitemap.xml']) {
    const res = await get(server, path);
    assert.strictEqual(res.status, 200, path);
    const body = await res.text();
    assert.ok(!/\{\{/.test(body), `placeholder i pazëvendësuar te ${path}`);
  }
  const home = await (await get(server, '/')).text();
  assert.match(home, /instagram\.com\/limetravel\.al/);
  assert.match(home, /<link rel="canonical" href="https:\/\/www\.limetravel\.al\/">/);
});

test('healthcheck, 404, ridrejtime dhe metoda', async (t) => {
  const server = await listen({});
  t.after(() => server.close());
  assert.strictEqual(await (await get(server, '/healthz')).text(), 'ok');
  const missing = await get(server, '/nuk-ekziston');
  assert.strictEqual(missing.status, 404);
  assert.match(await missing.text(), /Faqja nuk u gjet/);
  const redirect = await get(server, '/doktrina.html');
  assert.strictEqual(redirect.status, 301);
  assert.strictEqual(redirect.headers.get('location'), '/doktrina');
  assert.strictEqual((await get(server, '/../server.js')).status, 404);
  assert.strictEqual((await get(server, '/%2e%2e/server.js')).status, 404);
  const post = await fetch(`http://127.0.0.1:${server.address().port}/`, { method: 'POST' });
  assert.strictEqual(post.status, 405);
});

test('header sigurie, kompresim dhe ETag', async (t) => {
  const server = await listen({});
  t.after(() => server.close());
  const res = await get(server, '/', { 'accept-encoding': 'br' });
  assert.strictEqual(res.headers.get('content-encoding'), 'br');
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
  const etag = res.headers.get('etag');
  assert.strictEqual((await get(server, '/', { 'if-none-match': etag })).status, 304);
  const font = await get(server, '/assets/fonts/inter-latin-wght-normal.woff2');
  assert.match(font.headers.get('cache-control'), /immutable/);
});

test('kanalet opsionale shfaqen vetëm kur konfigurohen', async (t) => {
  const bare = await listen({ WHATSAPP_NUMBER: '', CONTACT_EMAIL: '' });
  const full = await listen({ WHATSAPP_NUMBER: '+355 69 000 0000', CONTACT_EMAIL: 'info@example.com', SITE_URL: 'https://example.com/' });
  t.after(() => { bare.close(); full.close(); });
  const a = await (await get(bare, '/')).text();
  assert.ok(!a.includes('wa.me/') && !a.includes('mailto:'));
  const b = await (await get(full, '/')).text();
  assert.ok(b.includes('https://wa.me/355690000000') && b.includes('mailto:info@example.com'));
  assert.ok(b.includes('href="https://example.com/"'));
});

test('render i shpëton vlerat', () => {
  assert.strictEqual(render('<a title="{{X}}">', { X: '"><script>' }, {}), '<a title="&quot;&gt;&lt;script&gt;">');
});

test('ndërtimi statik prodhon faqe të renderuara', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { build } = require('../build');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lt-'));
  assert.ok(build(dir) > 10);
  for (const page of ['index.html', 'doktrina.html', 'privatesia.html', '404.html']) {
    const html = fs.readFileSync(path.join(dir, page), 'utf8');
    assert.ok(!/\{\{/.test(html), page);
    assert.match(html, /class="footer"/);
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

test('WhatsApp-i zyrtar është kanali kryesor si parazgjedhje', async (t) => {
  const server = await listen({});
  t.after(() => server.close());
  const home = await (await get(server, '/')).text();
  assert.ok(home.includes('https://wa.me/355695397514?text='));
  assert.ok(home.includes('"telephone": "+355695397514"'));
  const privacy = await (await get(server, '/privatesia')).text();
  assert.ok(privacy.includes('mailto:info@limetravel.al'));
  assert.ok(home.includes('data-email="info@limetravel.al"'));
  assert.ok(privacy.includes('https://www.linkedin.com/company/limetravel-al'));
  assert.ok(privacy.includes('tel:+355695397514') && privacy.includes('+355 69 539 7514'));
});

test('çdo përkthim përputhet me shqipen (çelësa, shenja, etiketa)', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const { check } = require('../scripts/check-locales');
  const langs = fs
    .readdirSync(path.join(__dirname, '..', 'locales'))
    .map((f) => path.basename(f, '.json'))
    .filter((c) => c !== 'sq');
  assert.ok(langs.length >= 1);
  for (const lang of langs) assert.deepStrictEqual(check(lang), [], lang);
});

test('çdo gjuhë ka faqet e veta, hreflang dhe zgjedhës gjuhe', async (t) => {
  const { LANGS, pageUrl } = require('../server');
  const fs = require('node:fs');
  const path = require('node:path');
  const server = await listen({});
  t.after(() => server.close());
  const active = LANGS.filter((l) => fs.existsSync(path.join(__dirname, '..', 'locales', `${l.code}.json`)));
  assert.ok(active.length >= 2);
  for (const lang of active) {
    for (const id of ['home', 'doctrine', 'privacy']) {
      const url = pageUrl(lang, id);
      const res = await get(server, url);
      assert.strictEqual(res.status, 200, url);
      const html = await res.text();
      assert.match(html, new RegExp(`<html lang="${lang.code}">`), url);
      assert.ok(!/\{\{/.test(html), `placeholder te ${url}`);
      for (const other of active) assert.ok(html.includes(`hreflang="${other.code}"`), `${url} → ${other.code}`);
      assert.ok(html.includes(`<link rel="canonical" href="https://www.limetravel.al${url}">`), url);
    }
    const missing = await get(server, pageUrl(lang, 'home') + 'nuk-ekziston');
    assert.strictEqual(missing.status, 404);
  }
  const en = await (await get(server, '/en/')).text();
  assert.ok(en.includes('data-strings="{&quot;greeting&quot;'));
  assert.ok(en.includes('href="/en/#kerkese"') && en.includes('href="/en/doctrine"'));
  assert.strictEqual((await get(server, '/en')).status, 301);
  const sitemap = await (await get(server, '/sitemap.xml')).text();
  assert.ok(sitemap.includes('hreflang="en"') && sitemap.includes('/en/doctrine'));
});

test('ndërtimi statik shkruan faqet e çdo gjuhe', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { build } = require('../build');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lt-i18n-'));
  build(dir);
  for (const file of ['index.html', 'en/index.html', 'en/doctrine.html', 'en/404.html', 'sitemap.xml']) {
    assert.ok(fs.existsSync(path.join(dir, file)), file);
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

test('artikujt e blogut janë të vlefshëm dhe të çiftuar sq↔en', () => {
  const { check } = require('../scripts/check-blog');
  assert.deepStrictEqual(check(), []);
});

test('markdown: tituj, lista, tabela, lidhje të sigurta dhe pa {{ }}', () => {
  const { markdownToHtml } = require('../lib/blog');
  const { html, headings } = markdownToHtml(
    '## Pyetja\n\nTekst me **theks**, *kursiv* dhe [lidhje](https://example.com) <script>x</script> {{SITE_URL}}.\n\n- një\n- dy\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n[keq](javascript:alert(1))\n'
  );
  assert.deepStrictEqual(headings, [{ id: 'pyetja', text: 'Pyetja' }]);
  assert.ok(html.includes('<strong>theks</strong>') && html.includes('<em>kursiv</em>'));
  assert.ok(html.includes('<a href="https://example.com" rel="noopener">lidhje</a>'));
  assert.ok(html.includes('&lt;script&gt;') && !html.includes('<script>'));
  assert.ok(!html.includes('{{') && !html.includes('javascript:'));
  assert.ok(html.includes('<ul><li>një</li><li>dy</li></ul>') && html.includes('<th scope="col">A</th>'));
  assert.throws(() => markdownToHtml('# Titull i parë'));
});

test('blogu: indeksi, artikujt, SEO/AEO, RSS dhe sitemap', async (t) => {
  const server = await listen({});
  t.after(() => server.close());
  const { loadPosts } = require('../lib/blog');
  const posts = loadPosts();
  assert.ok(posts.length >= 4);
  for (const index of ['/blog/', '/en/blog/']) {
    const res = await get(server, index);
    assert.strictEqual(res.status, 200, index);
    const html = await res.text();
    assert.ok(html.includes('"@type":"Blog"') && html.includes('type="application/rss+xml"'), index);
    assert.ok(!/\{\{/.test(html), index);
  }
  assert.strictEqual((await get(server, '/blog')).status, 301);
  for (const post of posts) {
    const url = (post.lang === 'sq' ? '/blog/' : '/en/blog/') + post.slug;
    const res = await get(server, url);
    assert.strictEqual(res.status, 200, url);
    const html = await res.text();
    assert.ok(html.includes('"@type":"BlogPosting"') && html.includes('"@type":"FAQPage"') && html.includes('"@type":"BreadcrumbList"'), url);
    assert.ok(html.includes(`<link rel="canonical" href="https://www.limetravel.al${url}">`), url);
    assert.ok(html.includes('hreflang="sq"') && html.includes('hreflang="en"') && html.includes('hreflang="x-default"'), url);
    assert.ok(html.includes('og:type" content="article"'), url);
    assert.ok(html.includes('class="summary"') && html.includes('class="post__sources"'), url);
    assert.ok(!/\{\{/.test(html), `placeholder te ${url}`);
  }
  const feed = await (await get(server, '/en/blog/feed.xml')).text();
  assert.ok(feed.includes('<rss') && feed.includes('/en/blog/etias-ees-albanian-citizens'));
  const sitemap = await (await get(server, '/sitemap.xml')).text();
  assert.ok(sitemap.includes('/blog/etias-ees-shqiptaret-cfare-ndryshon') && sitemap.includes('<lastmod>'));
  const home = await (await get(server, '/')).text();
  assert.ok(home.includes('blog-latest-title') && home.includes('href="/blog/"'));
  const it = await (await get(server, '/it/')).text();
  assert.ok(it.includes('href="/en/blog/"') && !it.includes('blog-latest-title'));
});

test('faqet e destinacioneve dhe aktiviteteve janë të vlefshme dhe të çiftuara', () => {
  const { check } = require('../scripts/check-guides');
  assert.deepStrictEqual(check(), []);
});

test('destinacione dhe aktivitete: indekse, faqe, SEO/AEO, sitemap dhe navigim', async (t) => {
  const server = await listen({});
  t.after(() => server.close());
  const { loadGuides, guideUrl, sectionUrl } = require('../lib/guides');
  const guides = loadGuides();
  assert.ok(guides.length >= 10);
  for (const [lang, kind] of [['sq', 'destination'], ['sq', 'activity'], ['en', 'destination'], ['en', 'activity']]) {
    const res = await get(server, sectionUrl(lang, kind));
    assert.strictEqual(res.status, 200, sectionUrl(lang, kind));
    assert.ok(!/\{\{/.test(await res.text()));
  }
  for (const g of guides) {
    const url = guideUrl(g);
    const res = await get(server, url);
    assert.strictEqual(res.status, 200, url);
    const html = await res.text();
    assert.ok(html.includes('"@type":"FAQPage"') && html.includes('"@type":"BreadcrumbList"'), url);
    assert.ok(g.kind === 'destination' ? html.includes('"@type":"TouristDestination"') && html.includes('openstreetmap.org') : html.includes('"@type":"WebPage"'), url);
    assert.ok(html.includes('class="facts"') && html.includes('class="summary"') && html.includes('class="post__sources"'), url);
    assert.ok(html.includes('hreflang="sq"') && html.includes('hreflang="en"'), url);
    assert.ok(!/\{\{/.test(html), url);
  }
  const home = await (await get(server, '/')).text();
  assert.ok(home.includes('destinations-title') && home.includes('href="/destinacione/"') && home.includes('href="/aktivitete/"'));
  const it = await (await get(server, '/it/')).text();
  assert.ok(it.includes('href="/en/destinations/"') && it.includes('href="/en/activities/"'));
  const sitemap = await (await get(server, '/sitemap.xml')).text();
  assert.ok(sitemap.includes('/destinacione/alpet-shqiptare-theth-valbone') && sitemap.includes('/en/activities/hiking-in-albania'));
});
