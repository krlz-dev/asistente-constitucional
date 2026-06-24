/**
 * Shared chatbot core: knowledge-base grounding + prompt building + Groq call.
 *
 * This module is imported by BOTH the /api/chat route and the scope tests, so
 * the tests always exercise the exact same system prompt, grounding and model
 * configuration that ships to production. Keep it free of Astro-specific APIs
 * (e.g. import.meta.env) so it can run under plain Node too.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const CHAT_MODEL = 'llama-3.3-70b-versatile';
export const CHAT_TEMPERATURE = 0.3;
export const CHAT_MAX_TOKENS = 1500;

// Load knowledge base once per module instance.
let knowledgeBase = [];
try {
  const kbPath = join(process.cwd(), 'data', 'knowledge_base.json');
  knowledgeBase = JSON.parse(readFileSync(kbPath, 'utf-8'));
} catch (e) {
  console.warn('Knowledge base not loaded:', e.message);
}

// Simple keyword search to find relevant articles for grounding the answer.
export function searchRelevantArticles(query, limit = 5) {
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/).filter((w) => w.length > 3);

  const articleMatches = query.match(/art[íi]culo\s*(\d+)/gi) || [];
  const mentionedArticles = articleMatches.map((m) => parseInt(m.match(/\d+/)[0]));

  const scored = knowledgeBase.map((article) => {
    let score = 0;
    const contentLower = article.content.toLowerCase();
    const titleLower = (article.titulo || '').toLowerCase();

    if (mentionedArticles.includes(article.id)) score += 100;

    words.forEach((word) => {
      if (titleLower.includes(word)) score += 10;
      if (contentLower.includes(word)) score += 2;
    });

    const legalTerms = [
      'derecho', 'derechos', 'garantía', 'libertad', 'igualdad',
      'estado', 'nación', 'pueblo', 'ciudadano', 'constitución',
      'tribunal', 'judicial', 'legislativo', 'ejecutivo', 'autonomía',
      'indígena', 'plurinacional', 'democracia', 'elección', 'voto',
    ];

    legalTerms.forEach((term) => {
      if (queryLower.includes(term) && contentLower.includes(term)) score += 5;
    });

    return { ...article, score };
  });

  return scored
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Build the system prompt (with grounding context) for a given user message.
export function buildSystemPrompt(message) {
  const relevantArticles = searchRelevantArticles(message, 3);

  let context = '';
  if (relevantArticles.length > 0) {
    context =
      '\n\nCONTEXTO RELEVANTE DE LA CPE:\n' +
      relevantArticles.map((a) => a.content.substring(0, 2000)).join('\n---\n');
  }

  const systemPrompt = `Eres un asistente legal especializado EXCLUSIVAMENTE en la Constitución Política del Estado Plurinacional de Bolivia (CPE 2009).

ALCANCE ESTRICTO (REGLA PRINCIPAL):
- SOLO respondes preguntas relacionadas con la Constitución boliviana: sus artículos, derechos, deberes, garantías, estructura del Estado y conceptos de derecho constitucional boliviano derivados de ella.
- Si la pregunta NO trata sobre la Constitución boliviana (por ejemplo: programación, recetas, matemáticas, deportes, otros países, cultura general, o cualquier otro tema), NO la respondas. Declina cortésmente con un mensaje similar a: "Solo puedo ayudarte con consultas sobre la Constitución Política del Estado Plurinacional de Bolivia. ¿Tienes alguna pregunta sobre la CPE?"
- NUNCA uses conocimiento general fuera del ámbito constitucional boliviano para responder, aunque conozcas la respuesta.
- No inventes artículos ni contenido que no exista en la Constitución. Si no estás seguro, indícalo.
- Cuando exista CONTEXTO RELEVANTE DE LA CPE más abajo, basa tu respuesta principalmente en él.

Tu rol (dentro del alcance permitido):
- Responder preguntas sobre la Constitución boliviana de forma clara y precisa
- Citar artículos específicos cuando sea relevante
- Explicar conceptos constitucionales en lenguaje accesible

Estructura de la CPE:
- Primera Parte: Bases Fundamentales del Estado (Art. 1-12)
- Segunda Parte: Derechos, Deberes y Garantías (Art. 13-144)
- Tercera Parte: Estructura del Estado (Art. 145-268)
- Cuarta Parte: Estructura Económica del Estado (Art. 269-341)
- Quinta Parte: Primacía y Reforma de la Constitución (Art. 342-411)

IMPORTANTE: Cuando cites artículos, usa SIEMPRE el formato "Artículo X" (ejemplo: "Artículo 7", "Artículo 13"). Esto permite que el usuario haga clic en la referencia para ver el artículo completo.

Responde siempre en español y de forma profesional pero amigable.${context}`;

  return { systemPrompt, relevantArticles };
}

/**
 * Generate a chatbot reply for a message. Throws an Error (with `.status` set
 * when the upstream API responded with an HTTP error) on failure.
 */
export async function generateReply({ message, apiKey, fetchImpl = fetch }) {
  const { systemPrompt, relevantArticles } = buildSystemPrompt(message);

  const response = await fetchImpl(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: CHAT_TEMPERATURE,
      max_tokens: CHAT_MAX_TOKENS,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const err = new Error(`Groq API error: ${errorText}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const reply = data.choices[0]?.message?.content || 'No response generated';
  return { reply, relevantArticles };
}
