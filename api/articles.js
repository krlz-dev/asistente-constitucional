import { readFileSync } from 'fs';
import { join } from 'path';

let articulos = [];
let articulosCompletos = [];

try {
  const listPath = join(process.cwd(), 'data', 'articulos_lista.json');
  articulos = JSON.parse(readFileSync(listPath, 'utf-8'));

  const completosPath = join(process.cwd(), 'data', 'articulos_completos.json');
  articulosCompletos = JSON.parse(readFileSync(completosPath, 'utf-8'));
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

  const { id } = req.query;

  // If ID provided, return single article with full details
  if (id) {
    const articleId = parseInt(id);
    const article = articulosCompletos.find(a => a.id === articleId);

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    return res.status(200).json(article);
  }

  // Return list of all articles
  return res.status(200).json({
    total: articulos.length,
    articulos: articulos
  });
}
