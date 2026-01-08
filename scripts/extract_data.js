#!/usr/bin/env node
/**
 * Extract data from PostgreSQL dump to JSON
 */

const fs = require('fs');
const path = require('path');

const dumpPath = path.join(__dirname, '../data/db_econstitucional_backup.dump');
const outputDir = path.join(__dirname, '../data');

// Read dump file
const dump = fs.readFileSync(dumpPath, 'utf-8');

// Helper to decode PostgreSQL escaped text
function decodePostgresText(text) {
    if (!text || text === '\\N') return null;
    return text
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
}

// Helper to strip HTML tags for plain text
function stripHtml(html) {
    if (!html) return '';
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&aacute;/g, 'á')
        .replace(/&eacute;/g, 'é')
        .replace(/&iacute;/g, 'í')
        .replace(/&oacute;/g, 'ó')
        .replace(/&uacute;/g, 'ú')
        .replace(/&ntilde;/g, 'ñ')
        .replace(/&Aacute;/g, 'Á')
        .replace(/&Eacute;/g, 'É')
        .replace(/&Iacute;/g, 'Í')
        .replace(/&Oacute;/g, 'Ó')
        .replace(/&Uacute;/g, 'Ú')
        .replace(/&Ntilde;/g, 'Ñ')
        .replace(/&ldquo;/g, '"')
        .replace(/&rdquo;/g, '"')
        .replace(/&lsquo;/g, "'")
        .replace(/&rsquo;/g, "'")
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
}

// Extract dbo_articulo data
function extractArticulos(dump) {
    const articulos = [];
    const startMarker = 'COPY public.dbo_articulo';
    const endMarker = '\\.';

    const startIdx = dump.indexOf(startMarker);
    if (startIdx === -1) return articulos;

    const dataStart = dump.indexOf('\n', startIdx) + 1;
    const dataEnd = dump.indexOf('\n' + endMarker + '\n', dataStart);

    const dataSection = dump.substring(dataStart, dataEnd);
    const lines = dataSection.split('\n');

    for (const line of lines) {
        if (!line.trim()) continue;
        const fields = line.split('\t');
        if (fields.length >= 14) {
            const articulo = {
                id: parseInt(fields[1]) || 0,
                titulo: decodePostgresText(fields[2]),
                presentacion: stripHtml(decodePostgresText(fields[3])),
                articuloTranscrito: stripHtml(decodePostgresText(fields[4])),
                descripcion: stripHtml(decodePostgresText(fields[5])),
                tratamientoConstitucional: stripHtml(decodePostgresText(fields[6])),
                tratamientoActas: stripHtml(decodePostgresText(fields[7])),
                alcanceReservaLegal: stripHtml(decodePostgresText(fields[8])),
                bibliografia: stripHtml(decodePostgresText(fields[9])),
                webgrafia: stripHtml(decodePostgresText(fields[10])),
                documentosLegales: stripHtml(decodePostgresText(fields[11])),
                archivosResoluciones: stripHtml(decodePostgresText(fields[12])),
            };
            if (articulo.id > 0) {
                articulos.push(articulo);
            }
        }
    }

    return articulos.sort((a, b) => a.id - b.id);
}

// Extract dbo_analisis data
function extractAnalisis(dump) {
    const analisis = [];
    const startMarker = 'COPY public.dbo_analisis';
    const endMarker = '\\.';

    const startIdx = dump.indexOf(startMarker);
    if (startIdx === -1) return analisis;

    const dataStart = dump.indexOf('\n', startIdx) + 1;
    const dataEnd = dump.indexOf('\n' + endMarker + '\n', dataStart);

    const dataSection = dump.substring(dataStart, dataEnd);
    const lines = dataSection.split('\n');

    for (const line of lines) {
        if (!line.trim()) continue;
        const fields = line.split('\t');
        if (fields.length >= 6) {
            const item = {
                articuloId: parseInt(fields[1]) || 0,
                tipo: decodePostgresText(fields[2]),
                titulo: decodePostgresText(fields[3]),
                contenido: stripHtml(decodePostgresText(fields[4])),
                concordancias: stripHtml(decodePostgresText(fields[5])),
            };
            if (item.articuloId > 0) {
                analisis.push(item);
            }
        }
    }

    return analisis;
}

// Main extraction
console.log('Extracting data from PostgreSQL dump...');

const articulos = extractArticulos(dump);
const analisis = extractAnalisis(dump);

console.log(`Found ${articulos.length} artículos`);
console.log(`Found ${analisis.length} análisis entries`);

// Merge analisis into articulos
const articulosConAnalisis = articulos.map(art => {
    const artAnalisis = analisis.filter(a => a.articuloId === art.id);
    return {
        ...art,
        analisis: artAnalisis
    };
});

// Save full data
fs.writeFileSync(
    path.join(outputDir, 'articulos_completos.json'),
    JSON.stringify(articulosConAnalisis, null, 2),
    'utf-8'
);

// Create a compact version for the AI knowledge base
const knowledgeBase = articulosConAnalisis.map(art => {
    let content = `ARTÍCULO ${art.id}: ${art.titulo || ''}\n`;
    if (art.articuloTranscrito) {
        content += `\nTEXTO: ${art.articuloTranscrito}\n`;
    }
    if (art.descripcion) {
        content += `\nDESCRIPCIÓN: ${art.descripcion}\n`;
    }
    if (art.analisis && art.analisis.length > 0) {
        content += `\nANÁLISIS:\n`;
        art.analisis.forEach(a => {
            if (a.contenido) {
                content += `- ${a.tipo}: ${a.titulo}\n${a.contenido}\n`;
            }
        });
    }
    return {
        id: art.id,
        titulo: art.titulo,
        content: content.substring(0, 8000) // Limit size
    };
}).filter(art => art.content.length > 50);

fs.writeFileSync(
    path.join(outputDir, 'knowledge_base.json'),
    JSON.stringify(knowledgeBase, null, 2),
    'utf-8'
);

// Create a summary for the frontend (lighter version)
const articulosSummary = articulos.map(art => ({
    id: art.id,
    titulo: art.titulo,
    presentacion: art.presentacion ? art.presentacion.substring(0, 300) + '...' : null,
    tieneAnalisis: analisis.some(a => a.articuloId === art.id)
})).filter(art => art.titulo);

fs.writeFileSync(
    path.join(outputDir, 'articulos_lista.json'),
    JSON.stringify(articulosSummary, null, 2),
    'utf-8'
);

console.log('\nFiles created:');
console.log('- data/articulos_completos.json (full data)');
console.log('- data/knowledge_base.json (for AI)');
console.log('- data/articulos_lista.json (for frontend list)');
console.log('\nDone!');
