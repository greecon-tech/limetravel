'use strict';

// LimeTravel — server statik pa varësi të jashtme, gati për Railway.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const PUBLIC_DIR = path.join(__dirname, 'public');
const PARTIALS_DIR = path.join(__dirname, 'partials');

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
  return {
    SITE_URL: (clean(env.SITE_URL) || 'https://www.limetravel.al').replace(/\/+$/, ''),
    INSTAGRAM: (clean(env.INSTAGRAM_HANDLE) || 'limetravel.al').replace(/^@/, ''),
    WHATSAPP: clean(env.WHATSAPP_NUMBER).replace(/\D/g, ''),
    EMAIL: clean(env.CONTACT_EMAIL),
    YEAR: String(new Date().getFullYear()),
  };
}

function render(source, config, partials) {
  return source
    .replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => partials[name] || '')
    .replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, body) => (config[key] ? body : ''))
    .replace(/\{\{(\w+)\}\}/g, (match, key) => (key in config ? escapeHtml(config[key]) : match));
}

function cachePolicy(urlPath, ext) {
  if (urlPath.startsWith('/assets/fonts/')) return 'public, max-age=31536000, immutable';
  if (urlPath.startsWith('/assets/img/') || ext === '.ico') return 'public, max-age=604800';
  if (ext === '.css' || ext === '.js') return 'public, max-age=3600, must-revalidate';
  return 'public, max-age=0, must-revalidate';
}

// Ngarkon çdo skedar në memorie një herë: i renderuar, i kompresuar dhe me ETag.
function buildSite(config = readConfig()) {
  const partials = {};
  for (const file of fs.readdirSync(PARTIALS_DIR)) {
    partials[path.basename(file, '.html')] = fs.readFileSync(path.join(PARTIALS_DIR, file), 'utf8');
  }
  const files = new Map();
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
      const asset = {
        body,
        type: MIME[ext],
        cache: cachePolicy(urlPath, ext),
        etag: '"' + crypto.createHash('sha1').update(body).digest('base64url').slice(0, 20) + '"',
      };
      if (COMPRESSIBLE.has(ext) && body.length > 512) {
        asset.br = zlib.brotliCompressSync(body, {
          params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
        });
        asset.gzip = zlib.gzipSync(body, { level: 9 });
      }
      files.set(urlPath, asset);
    }
  };
  walk(PUBLIC_DIR);
  return files;
}

function resolveAsset(files, pathname) {
  if (pathname === '/') return files.get('/index.html');
  if (pathname.endsWith('.html')) return undefined; // vetëm URL të pastra
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

    // /doktrina/ → /doktrina, /index.html → /, /doktrina.html → /doktrina
    let canonical = pathname.replace(/\/{2,}/g, '/');
    if (canonical.length > 1 && canonical.endsWith('/')) canonical = canonical.slice(0, -1);
    if (canonical.endsWith('.html')) canonical = canonical.slice(0, -5);
    if (canonical === '/index') canonical = '/';
    if (canonical !== pathname && resolveAsset(files, canonical)) {
      const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      res.writeHead(301, { ...SECURITY_HEADERS, Location: canonical + query, 'Content-Length': 0 });
      return res.end();
    }

    const asset = pathname === '/404' ? undefined : resolveAsset(files, pathname);
    if (!asset) {
      const notFound = files.get('/404.html');
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

module.exports = { buildSite, createHandler, readConfig, render };
