import { readFileSync } from 'fs';
import { join } from 'path';

let articulos = [];
let articulosEnhanced = [];
let tematicas = [];

try {
  const listPath = join(process.cwd(), 'data', 'articulos_lista.json');
  articulos = JSON.parse(readFileSync(listPath, 'utf-8'));

  const enhancedPath = join(process.cwd(), 'data', 'articulos_enhanced.json');
  articulosEnhanced = JSON.parse(readFileSync(enhancedPath, 'utf-8'));

  const tematicasPath = join(process.cwd(), 'data', 'tematicas.json');
  tematicas = JSON.parse(readFileSync(tematicasPath, 'utf-8'));
} catch (e) {
  console.warn('Articles data not loaded:', e.message);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, tematica } = req.query;

  // Get single article with full details
  if (id) {
    const articleId = parseInt(id);
    const article = articulosEnhanced.find(a => a.id === articleId);

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    return res.status(200).json(article);
  }

  // Get articles by temática
  if (tematica) {
    const tema = tematicas.find(t => t.titulo.toLowerCase() === tematica.toLowerCase());
    if (!tema) {
      return res.status(404).json({ error: 'Temática not found' });
    }

    const arts = articulos.filter(a => tema.articulos.includes(a.id));
    return res.status(200).json({
      tematica: tema,
      articulos: arts
    });
  }

  // Return list with tematicas
  return res.status(200).json({
    total: articulos.length,
    totalTematicas: tematicas.length,
    tematicas: tematicas,
    articulos: articulos
  });
}
