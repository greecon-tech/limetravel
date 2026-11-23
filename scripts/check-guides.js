'use strict';

// Kontrollon faqet e destinacioneve dhe të aktiviteteve (content/guides).
const { loadGuides, validateGuides } = require('../lib/guides');

function check() {
  return validateGuides(loadGuides());
}

module.exports = { check };

if (require.main === module) {
  const guides = loadGuides();
  const problems = validateGuides(guides);
  console.log(`${guides.length} skedarë, ${problems.length ? problems.length + ' probleme' : 'në rregull'}`);
  problems.forEach((p) => console.log('  - ' + p));
  process.exit(problems.length ? 1 : 0);
}
