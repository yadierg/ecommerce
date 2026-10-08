#!/usr/bin/env node

/**
 * Muestra un resumen de coverage de las 4 apps.
 * Uso: node scripts/coverage-summary.js
 */

const fs = require('fs');
const path = require('path');

const APPS = ['admin-api', 'budget-api', 'inventory-api', 'store-api'];
const COVERAGE_DIR = path.join(__dirname, '..', 'coverage');

function fmt(n) {
  return n.toString().padStart(5) + '%';
}

function colored(pct) {
  if (pct >= 90) return `\x1b[32m${fmt(pct)}\x1b[0m`; // verde
  if (pct >= 80) return `\x1b[33m${fmt(pct)}\x1b[0m`; // amarillo
  return `\x1b[31m${fmt(pct)}\x1b[0m`; // rojo
}

console.log('\n📊 Coverage Summary\n');
console.log('App           | Stmts  | Branch | Funcs  | Lines');
console.log('--------------|--------|--------|--------|--------');

let totals = { statements: 0, branches: 0, functions: 0, lines: 0 };
let count = 0;

for (const app of APPS) {
  const summaryPath = path.join(COVERAGE_DIR, app, 'coverage-summary.json');

  if (!fs.existsSync(summaryPath)) {
    console.log(`${app.padEnd(13)} | \x1b[31m   N/A (run test:coverage)\x1b[0m`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const t = data.total;

  console.log(
    `${app.padEnd(13)} | ${colored(t.statements.pct)} | ${colored(t.branches.pct)} | ${colored(t.functions.pct)} | ${colored(t.lines.pct)}`
  );

  totals.statements += t.statements.pct;
  totals.branches += t.branches.pct;
  totals.functions += t.functions.pct;
  totals.lines += t.lines.pct;
  count++;
}

if (count > 0) {
  console.log('--------------|--------|--------|--------|--------');
  console.log(
    `${'PROMEDIO'.padEnd(13)} | ${colored(totals.statements / count)} | ${colored(totals.branches / count)} | ${colored(totals.functions / count)} | ${colored(totals.lines / count)}`
  );
}

console.log('\n💡 Leyenda: \x1b[32m≥90%\x1b[0m | \x1b[33m80-89%\x1b[0m | \x1b[31m<80%\x1b[0m\n');