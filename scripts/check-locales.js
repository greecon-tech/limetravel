'use strict';

// Kontrollon që çdo skedar locales/<gjuha>.json përputhet me shqipen (locales/sq.json):
// të njëjtët çelësa, të njëjtat shenja {{...}}, {n}, {date} dhe të njëjtat etiketa HTML.
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', 'locales');
const PLAIN = /^(attr|site|js|ui)\./; // vlera pa HTML dhe pa thonjëza dyfishe

const load = (lang) => JSON.parse(fs.readFileSync(path.join(DIR, `${lang}.json`), 'utf8'));
const tokens = (v) => (v.match(/\{\{[^}]*\}\}|\{n\}|\{date\}/g) || []).sort().join('|');
const tags = (v) => (v.match(/<\/?[a-zA-Z][a-zA-Z0-9]*/g) || []).map((t) => t.toLowerCase()).join(' ');

function check(lang) {
  const base = load('sq');
  const dict = load(lang);
  const problems = [];
  for (const key of Object.keys(base)) {
    if (!(key in dict)) { problems.push(`${key}: mungon`); continue; }
    const value = dict[key];
    if (typeof value !== 'string' || !value.trim()) { problems.push(`${key}: bosh`); continue; }
    if (tokens(value) !== tokens(base[key])) problems.push(`${key}: shenjat {{…}} ndryshojnë (${tokens(base[key])} → ${tokens(value)})`);
    if (tags(value) !== tags(base[key])) problems.push(`${key}: etiketat HTML ndryshojnë`);
    if (PLAIN.test(key) && /["<>]/.test(value)) problems.push(`${key}: nuk lejohen thonjëza dyfishe ose HTML`);
  }
  for (const key of Object.keys(dict)) if (!(key in base)) problems.push(`${key}: çelës i panjohur`);
  return problems;
}

module.exports = { check, load };

if (require.main === module) {
  const langs = process.argv.slice(2);
  let bad = 0;
  for (const lang of langs) {
    const problems = check(lang);
    console.log(`${lang}: ${problems.length ? problems.length + ' probleme' : 'në rregull'}`);
    problems.slice(0, 40).forEach((p) => console.log('  - ' + p));
    bad += problems.length;
  }
  process.exit(bad ? 1 : 0);
}
