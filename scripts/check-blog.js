'use strict';

// Kontrollon artikujt e blogut: front matter, gjatësi, burime, FAQ, çiftimi sq↔en.
const { loadPosts, validatePosts } = require('../lib/blog');

function check() {
  return validatePosts(loadPosts());
}

module.exports = { check };

if (require.main === module) {
  const posts = loadPosts();
  const problems = validatePosts(posts);
  console.log(`${posts.length} skedarë artikujsh, ${problems.length ? problems.length + ' probleme' : 'në rregull'}`);
  problems.forEach((p) => console.log('  - ' + p));
  process.exit(problems.length ? 1 : 0);
}
