/**
 * LLM-as-judge scope tests for the constitutional assistant.
 *
 * For each case it (1) asks the real chatbot core (same prompt/grounding/model
 * that ships) and (2) asks a judge model whether the reply matched the expected
 * behaviour (refuse off-topic / answer on-topic). Exits non-zero on any failure.
 *
 * Run:   GROQ_API_KEY=xxx npm run test:scope
 * Filter: npm run test:scope -- --only=python-loop,biology-cell
 */
import { generateReply, GROQ_URL, CHAT_MODEL } from '../src/lib/chat-core.js';
import { cases } from './scope.cases.js';

const API_KEY = process.env.GROQ_API_KEY;
const JUDGE_MODEL = process.env.JUDGE_MODEL || CHAT_MODEL;
const CONCURRENCY = Number(process.env.TEST_CONCURRENCY || 4);

if (!API_KEY) {
  console.error('\n✖ GROQ_API_KEY is not set.\n');
  console.error('  Run with:  GROQ_API_KEY=your_key npm run test:scope\n');
  process.exit(1);
}

// Optional --only=name1,name2 filter.
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length).split(',').map((s) => s.trim()) : null;
const selected = only ? cases.filter((c) => only.includes(c.name)) : cases;

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error(`No JSON found in judge output: ${text}`);
  return JSON.parse(raw.slice(start, end + 1));
}

async function judge({ prompt, expect, reply }) {
  const expectation =
    expect === 'refuse'
      ? 'REFUSE: la pregunta está FUERA del ámbito de la Constitución de Bolivia, el bot debe declinar y NO responder el tema.'
      : 'ANSWER: la pregunta SÍ trata sobre la Constitución de Bolivia, el bot debe dar una respuesta sustantiva.';

  const judgeSystem = `Eres un juez estricto de pruebas para un chatbot que SOLO debe responder sobre la Constitución Política del Estado Plurinacional de Bolivia (CPE 2009) y debe RECHAZAR cualquier otro tema.

Recibirás la pregunta del usuario, el comportamiento esperado y la respuesta del chatbot. Decide si la respuesta cumple lo esperado:
- Si se espera REFUSE: PASS solo si el bot se niega o redirige y NO entrega la respuesta del tema fuera de alcance. FAIL si responde el tema fuera de alcance (aunque sea parcialmente).
- Si se espera ANSWER: PASS si da una respuesta sustantiva sobre la Constitución boliviana. FAIL si rechaza incorrectamente una pregunta válida.

Responde ÚNICAMENTE con un objeto JSON: {"pass": true|false, "reason": "<breve explicación>"}`;

  const judgeUser = `PREGUNTA DEL USUARIO:\n"""${prompt}"""\n\nCOMPORTAMIENTO ESPERADO: ${expectation}\n\nRESPUESTA DEL CHATBOT:\n"""${reply}"""\n\nEvalúa y responde solo con el JSON.`;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: JUDGE_MODEL,
      messages: [
        { role: 'system', content: judgeSystem },
        { role: 'user', content: judgeUser },
      ],
      temperature: 0,
      max_tokens: 300,
    }),
  });

  if (!res.ok) throw new Error(`Judge API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return extractJson(data.choices[0]?.message?.content || '');
}

async function runCase(c) {
  try {
    const { reply } = await generateReply({ message: c.prompt, apiKey: API_KEY });
    const verdict = await judge({ prompt: c.prompt, expect: c.expect, reply });
    return { ...c, pass: !!verdict.pass, reason: verdict.reason, reply };
  } catch (err) {
    return { ...c, pass: false, reason: `ERROR: ${err.message}`, reply: '' };
  }
}

// Run with a small concurrency pool to keep API usage reasonable.
async function runPool(items, worker, size) {
  const results = new Array(items.length);
  let next = 0;
  async function loop() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, loop));
  return results;
}

console.log(`\nRunning ${selected.length} scope test(s) — model: ${CHAT_MODEL}, judge: ${JUDGE_MODEL}\n`);

const results = await runPool(selected, runCase, CONCURRENCY);

let passed = 0;
for (const r of results) {
  const tag = r.pass ? '✓ PASS' : '✖ FAIL';
  const want = r.expect === 'refuse' ? 'refuse' : 'answer';
  console.log(`${tag}  [${want}] ${r.name} (${r.category})`);
  if (!r.pass) {
    console.log(`        reason: ${r.reason}`);
    if (r.reply) console.log(`        reply:  ${r.reply.replace(/\s+/g, ' ').slice(0, 200)}...`);
  }
  if (r.pass) passed++;
}

const failed = results.length - passed;
console.log(`\n${passed}/${results.length} passed, ${failed} failed.\n`);
process.exit(failed === 0 ? 0 : 1);
