#!/usr/bin/env node
/**
 * Build enhanced data with categories and article links
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const articulos = JSON.parse(fs.readFileSync(path.join(dataDir, 'articulos_completos.json'), 'utf-8'));

// Extract article references from concordancias text
function extractArticleRefs(text) {
  if (!text) return [];
  const pattern = /Art[íi]culo\s+(\d+)/gi;
  const matches = [...text.matchAll(pattern)];
  return [...new Set(matches.map(m => parseInt(m[1])))].sort((a, b) => a - b);
}

// Format text with proper paragraph breaks
function formatText(text) {
  if (!text) return '';

  // Split into sentences
  const sentences = text.split(/(?<=\.)\s+/);

  if (sentences.length <= 3) {
    return '<p>' + text + '</p>';
  }

  // Group sentences into paragraphs (3-4 sentences each)
  const paragraphs = [];
  let currentPara = [];

  sentences.forEach((sentence, idx) => {
    currentPara.push(sentence);

    // Check if we should break here
    const shouldBreak =
      // Every 3-4 sentences
      currentPara.length >= 3 ||
      // Or on transition words
      /^(Sin embargo|No obstante|Por otro lado|Por otra parte|Asimismo|Además|En este sentido|De esta manera|Por lo tanto|En consecuencia|Cabe señalar|Es importante|Es decir|En efecto|De igual forma|De igual manera|Finalmente|Por último|En primer lugar|En segundo lugar|Por ende|Ahora bien|Esta|Este|Estas|Estos|Dicha|Dicho|Dichas|Dichos)/i.test(sentences[idx + 1] || '') ||
      // Or on enumeration
      /^\d+[\.\)\-]/.test(sentences[idx + 1] || '') ||
      /^[a-z]\)/.test(sentences[idx + 1] || '');

    if (shouldBreak && currentPara.length > 0) {
      paragraphs.push(currentPara.join(' '));
      currentPara = [];
    }
  });

  // Add remaining sentences
  if (currentPara.length > 0) {
    paragraphs.push(currentPara.join(' '));
  }

  return paragraphs.map(p => '<p>' + p.trim() + '</p>').join('\n');
}

// Build temáticas index (main groupings)
const tematicas = new Map();

articulos.forEach(art => {
  if (art.analisis) {
    art.analisis.forEach(a => {
      if (a.tipo === 'Temática' && a.titulo) {
        const key = a.titulo.trim();
        if (!tematicas.has(key)) {
          tematicas.set(key, {
            titulo: key,
            articulos: [],
            descripcion: a.contenido ? a.contenido.substring(0, 300) : ''
          });
        }
        tematicas.get(key).articulos.push(art.id);
      }
    });
  }
});

// Sort temáticas by first article number
const tematicasArray = [...tematicas.values()]
  .map(t => ({
    ...t,
    articulos: [...new Set(t.articulos)].sort((a, b) => a - b)
  }))
  .sort((a, b) => a.articulos[0] - b.articulos[0]);

// Build enhanced articles with parsed concordancias
const articulosEnhanced = articulos.map(art => {
  const allRefs = new Set();

  // Parse concordancias from all analysis
  const analisisGrouped = {
    tematica: [],
    categoria: [],
    subcategoria: [],
    subtematica: []
  };

  if (art.analisis) {
    art.analisis.forEach(a => {
      // Extract article references
      if (a.concordancias) {
        extractArticleRefs(a.concordancias).forEach(ref => {
          if (ref !== art.id) allRefs.add(ref);
        });
      }

      // Group by type
      const item = {
        titulo: a.titulo,
        contenido: formatText(a.contenido),
        concordancias: a.concordancias,
        articulosRelacionados: a.concordancias ? extractArticleRefs(a.concordancias).filter(r => r !== art.id) : []
      };

      switch (a.tipo) {
        case 'Temática':
          analisisGrouped.tematica.push(item);
          break;
        case 'Categoría':
          analisisGrouped.categoria.push(item);
          break;
        case 'Subcategoría':
          analisisGrouped.subcategoria.push(item);
          break;
        case 'Subtemática':
          analisisGrouped.subtematica.push(item);
          break;
      }
    });
  }

  return {
    id: art.id,
    titulo: art.titulo,
    presentacion: formatText(art.presentacion),
    articuloTranscrito: art.articuloTranscrito, // Keep original for legal text
    descripcion: formatText(art.descripcion),
    analisis: analisisGrouped,
    articulosRelacionados: [...allRefs].sort((a, b) => a - b),
    totalConexiones: allRefs.size
  };
});

// Build connections graph for visualization
const conexiones = {};
articulosEnhanced.forEach(art => {
  conexiones[art.id] = art.articulosRelacionados;
});

// Save enhanced data
fs.writeFileSync(
  path.join(dataDir, 'articulos_enhanced.json'),
  JSON.stringify(articulosEnhanced, null, 2),
  'utf-8'
);

fs.writeFileSync(
  path.join(dataDir, 'tematicas.json'),
  JSON.stringify(tematicasArray, null, 2),
  'utf-8'
);

fs.writeFileSync(
  path.join(dataDir, 'conexiones.json'),
  JSON.stringify(conexiones, null, 2),
  'utf-8'
);

// Stats
console.log('=== Enhanced Data Generated ===\n');
console.log('Artículos procesados:', articulosEnhanced.length);
console.log('Temáticas encontradas:', tematicasArray.length);
console.log('Total conexiones:', articulosEnhanced.reduce((sum, a) => sum + a.totalConexiones, 0));
console.log('\nArchivos generados:');
console.log('- data/articulos_enhanced.json');
console.log('- data/tematicas.json');
console.log('- data/conexiones.json');

// Show sample temáticas
console.log('\n=== Primeras 10 Temáticas ===');
tematicasArray.slice(0, 10).forEach(t => {
  console.log(`• ${t.titulo} (Arts: ${t.articulos.join(', ')})`);
});
