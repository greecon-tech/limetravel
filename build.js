'use strict';

// Ndërton versionin statik të faqes në dist/ (për Netlify ose çdo strehim statik).
const fs = require('node:fs');
const path = require('node:path');
const { buildSite } = require('./server');

const OUT_DIR = path.join(__dirname, 'dist');

function build(outDir = OUT_DIR) {
  fs.rmSync(outDir, { recursive: true, force: true });
  const files = buildSite();
  for (const [urlPath, asset] of files) {
    const target = path.join(outDir, urlPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, asset.body);
  }
  return files.size;
}

if (require.main === module) {
  console.log(`U ndërtuan ${build()} skedarë në dist/`);
}

module.exports = { build };
