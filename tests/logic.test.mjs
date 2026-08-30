import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function between(start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Trecho não encontrado: ${start}`);
  return html.slice(from, to);
}

const context = {};
vm.createContext(context);
vm.runInContext([
  between('function mesAnoStr', 'const OPEN_ENDED_HORIZON_MONTHS'),
  between('function daysInMonth', 'function readPositiveMoney'),
  between('function calcVencimentoFatura', 'function nome'),
  between('function gerarRecorrencias', 'async function ensureOpenEndedSeries'),
].join('\n'), context);

const {
  addMonthsClamped,
  calcVencimentoFatura,
  gerarRecorrencias,
  gerarParcelas,
  splitAmountInCents,
} = context;

function ymd(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

assert.deepEqual(
  Array.from(gerarRecorrencias({}, new Date(2026, 0, 31, 12), 5, 'rec_test', 'despesa'), x => ymd(x.dataRelevante)),
  ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31'],
);

assert.deepEqual(
  Array.from(gerarRecorrencias({}, new Date(2026, 7, 31, 12), 3, 'rec_test_2', 'receita'), x => ymd(x.dataRelevante)),
  ['2026-08-31', '2026-09-30', '2026-10-31'],
);

assert.deepEqual(
  Array.from(gerarRecorrencias({}, new Date(2028, 0, 31, 12), 3, 'rec_leap', 'despesa'), x => ymd(x.dataRelevante)),
  ['2028-01-31', '2028-02-29', '2028-03-31'],
);

assert.equal(
  ymd(calcVencimentoFatura(new Date(2026, 0, 5, 12), 31, 31)),
  '2026-02-28',
);

assert.equal(
  ymd(calcVencimentoFatura(new Date(2026, 7, 10, 12), 10, 20)),
  '2026-09-20',
);

assert.deepEqual(Array.from(splitAmountInCents(100, 3)), [33.34, 33.33, 33.33]);
assert.equal(splitAmountInCents(100, 3).reduce((sum, value) => sum + value, 0), 100);
assert.equal(splitAmountInCents(10, 6).reduce((sum, value) => sum + value, 0), 10);

const parcelas = gerarParcelas(
  { valorTotal: 100, descricaoBase: 'Teste', serieDia: 31 },
  new Date(2026, 0, 31, 12),
  3,
  'rec_parcelas',
);
assert.deepEqual(Array.from(parcelas, x => x.valor), [33.34, 33.33, 33.33]);
assert.deepEqual(Array.from(parcelas, x => ymd(x.vencimento)), ['2026-01-31', '2026-02-28', '2026-03-31']);

assert.equal((html.match(/if\(w\.screen==='extra'\)/g) || []).length, 1);
const extraWizard = between("if(w.screen==='extra')", '// WIZARD HELPERS');
for (const field of ['id="w-conta"', 'id="w-date"', 'id="w-pessoa"', 'id="w-cat"']) {
  assert.ok(extraWizard.includes(field), `Campo ausente em entrada extra: ${field}`);
}
assert.ok(html.includes('upd.mesAno=mesAnoStr(d.getMonth(),d.getFullYear())'));
assert.ok(!html.includes('.setMonth('));
assert.ok(!html.includes('for(const it of items) await saveItem(it)'));
assert.ok(html.includes('serieSemFim:!temFim'));

console.log('Todos os testes de lógica passaram.');
