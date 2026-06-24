import { generateReply } from '../../lib/chat-core.js';

// This route runs on-demand as a serverless function.
export const prerender = false;

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

  try {
    const { reply, relevantArticles } = await generateReply({ message, apiKey: GROQ_API_KEY });
    const referencedArticles = relevantArticles.map((a) => ({ id: a.id, titulo: a.titulo }));
    return json({ reply, articlesReferenced: referencedArticles });
  } catch (error) {
    console.error('Error:', error);
    if (error.status) {
      return json({ error: 'Error from AI service' }, error.status);
    }
    return json({ error: 'Internal server error' }, 500);
  }
}
