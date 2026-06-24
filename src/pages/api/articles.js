import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// This route runs on-demand as a serverless function.
export const prerender = false;

let articulos = [];
let articulosEnhanced = [];
let tematicas = [];

try {
  const dataDir = join(process.cwd(), 'data');
  articulos = JSON.parse(readFileSync(join(dataDir, 'articulos_lista.json'), 'utf-8'));
  articulosEnhanced = JSON.parse(readFileSync(join(dataDir, 'articulos_enhanced.json'), 'utf-8'));
  tematicas = JSON.parse(readFileSync(join(dataDir, 'tematicas.json'), 'utf-8'));
} catch (e) {
  console.warn('Articles data not loaded:', e.message);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export function GET({ url }) {
  const id = url.searchParams.get('id');
  const tematica = url.searchParams.get('tematica');

  // Single article with full details
  if (id) {
    const articleId = parseInt(id);
    const article = articulosEnhanced.find((a) => a.id === articleId);
    if (!article) return json({ error: 'Article not found' }, 404);
    return json(article);
  }

  // Articles by temática
  if (tematica) {
    const tema = tematicas.find((t) => t.titulo.toLowerCase() === tematica.toLowerCase());
    if (!tema) return json({ error: 'Temática not found' }, 404);
    const arts = articulos.filter((a) => tema.articulos.includes(a.id));
    return json({ tematica: tema, articulos: arts });
  }

  // List with tematicas
  return json({
    total: articulos.length,
    totalTematicas: tematicas.length,
    tematicas,
    articulos,
  });
}
