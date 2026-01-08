import { readFileSync } from 'fs';
import { join } from 'path';

// Load knowledge base at startup
let knowledgeBase = [];
try {
  const kbPath = join(process.cwd(), 'data', 'knowledge_base.json');
  knowledgeBase = JSON.parse(readFileSync(kbPath, 'utf-8'));
} catch (e) {
  console.warn('Knowledge base not loaded:', e.message);
}

// Simple search function to find relevant articles
function searchRelevantArticles(query, limit = 5) {
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/).filter(w => w.length > 3);

  // Extract article numbers mentioned in query
  const articleMatches = query.match(/art[íi]culo\s*(\d+)/gi) || [];
  const mentionedArticles = articleMatches.map(m => parseInt(m.match(/\d+/)[0]));

  const scored = knowledgeBase.map(article => {
    let score = 0;
    const contentLower = article.content.toLowerCase();
    const titleLower = (article.titulo || '').toLowerCase();

    // Boost if article number is explicitly mentioned
    if (mentionedArticles.includes(article.id)) {
      score += 100;
    }

    // Score based on keyword matches
    words.forEach(word => {
      if (titleLower.includes(word)) score += 10;
      if (contentLower.includes(word)) score += 2;
    });

    // Check for specific legal terms
    const legalTerms = [
      'derecho', 'derechos', 'garantía', 'libertad', 'igualdad',
      'estado', 'nación', 'pueblo', 'ciudadano', 'constitución',
      'tribunal', 'judicial', 'legislativo', 'ejecutivo', 'autonomía',
      'indígena', 'plurinacional', 'democracia', 'elección', 'voto'
    ];

    legalTerms.forEach(term => {
      if (queryLower.includes(term) && contentLower.includes(term)) {
        score += 5;
      }
    });

    return { ...article, score };
  });

  return scored
    .filter(a => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // Search for relevant articles
  const relevantArticles = searchRelevantArticles(message, 3);

  // Build context from relevant articles
  let context = '';
  if (relevantArticles.length > 0) {
    context = '\n\nCONTEXTO RELEVANTE DE LA CPE:\n' +
      relevantArticles.map(a => a.content.substring(0, 2000)).join('\n---\n');
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

Responde siempre en español y de forma profesional pero amigable. Cuando cites artículos, menciona el número y un resumen del contenido.${context}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq API error:', error);
      return res.status(response.status).json({ error: 'Error from AI service' });
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || 'No response generated';

    // Include referenced articles in response
    const referencedArticles = relevantArticles.map(a => ({
      id: a.id,
      titulo: a.titulo
    }));

    return res.status(200).json({
      reply,
      articlesReferenced: referencedArticles
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
