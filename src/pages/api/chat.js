import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// This route runs on-demand as a serverless function.
export const prerender = false;

// Load knowledge base once per function instance.
let knowledgeBase = [];
try {
  const kbPath = join(process.cwd(), 'data', 'knowledge_base.json');
  knowledgeBase = JSON.parse(readFileSync(kbPath, 'utf-8'));
} catch (e) {
  console.warn('Knowledge base not loaded:', e.message);
}

// Simple keyword search to find relevant articles for grounding the answer.
function searchRelevantArticles(query, limit = 5) {
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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { message } = body || {};
  if (!message) {
    return json({ error: 'Message is required' }, 400);
  }

  const GROQ_API_KEY = import.meta.env.GROQ_API_KEY || process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return json({ error: 'API key not configured' }, 500);
  }

  const relevantArticles = searchRelevantArticles(message, 3);

  let context = '';
  if (relevantArticles.length > 0) {
    context =
      '\n\nCONTEXTO RELEVANTE DE LA CPE:\n' +
      relevantArticles.map((a) => a.content.substring(0, 2000)).join('\n---\n');
  }

  const systemPrompt = `Eres un asistente legal especializado en la Constitución Política del Estado Plurinacional de Bolivia (CPE 2009).

Tu rol es:
- Responder preguntas sobre la Constitución boliviana de forma clara y precisa
- Citar artículos específicos cuando sea relevante
- Explicar conceptos constitucionales en lenguaje accesible
- Mencionar cuando una pregunta está fuera del ámbito constitucional

Estructura de la CPE:
- Primera Parte: Bases Fundamentales del Estado (Art. 1-12)
- Segunda Parte: Derechos, Deberes y Garantías (Art. 13-144)
- Tercera Parte: Estructura del Estado (Art. 145-268)
- Cuarta Parte: Estructura Económica del Estado (Art. 269-341)
- Quinta Parte: Primacía y Reforma de la Constitución (Art. 342-411)

IMPORTANTE: Cuando cites artículos, usa SIEMPRE el formato "Artículo X" (ejemplo: "Artículo 7", "Artículo 13"). Esto permite que el usuario haga clic en la referencia para ver el artículo completo.

Responde siempre en español y de forma profesional pero amigable.${context}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq API error:', error);
      return json({ error: 'Error from AI service' }, response.status);
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || 'No response generated';

    const referencedArticles = relevantArticles.map((a) => ({ id: a.id, titulo: a.titulo }));

    return json({ reply, articlesReferenced: referencedArticles });
  } catch (error) {
    console.error('Error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}
