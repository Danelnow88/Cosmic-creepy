'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'source-manifest.json'), 'utf8'));
let checked = 0;
for (const [file, hash] of Object.entries(manifest.sourceSnapshot)) {
  if (file === 'js/game.js') continue;
  const data = fs.readFileSync(path.join(root, file));
  const actual = crypto.createHash('sha256').update(data).digest('hex');
  if (hash !== actual) throw Error('Original source changed: ' + file);
  checked++;
}
for (const file of ['prototype/roll.js', 'js/game.js', 'desktop/main.cjs', 'desktop/verify.cjs']) new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), { filename:file });
console.log('PASS: ' + checked + ' original sources preserved exactly; prototype syntax valid.');
