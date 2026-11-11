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
