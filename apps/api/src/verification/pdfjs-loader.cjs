// O pdf.js só existe em ESM. Este ficheiro é JavaScript simples (não passa pelo TypeScript, que trocaria
// o import() por require): carrega o pdf.js com import() dinâmico a partir da API, que é CommonJS.
module.exports = () => import('pdfjs-dist/legacy/build/pdf.mjs');
