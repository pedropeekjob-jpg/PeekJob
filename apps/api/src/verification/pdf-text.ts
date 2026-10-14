// pdf.js (build legacy): extrai o texto sem renderizar; o ficheiro nunca é escrito em disco.
// Desde a v4 o pdf.js só existe em ESM: carrega-se na primeira vez com import(), num ficheiro .cjs à parte
// (a API é CommonJS e o TypeScript trocaria o import() por require, que não carrega ESM).
type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs', { with: { 'resolution-mode': 'import' } });
// eslint-disable-next-line @typescript-eslint/no-require-imports
const loadPdfjs = require('./pdfjs-loader.cjs') as () => Promise<PdfJs>;
let lib: Promise<PdfJs> | undefined;
const pdfjs = () => (lib ??= loadPdfjs());

const MAX_PAGES = 10;

export async function pdfText(buf: Buffer): Promise<string> {
  try {
    const { getDocument } = await pdfjs();
    // sem eval (o pdf.js 6 já não o usa) nem fontes do sistema: só o texto
    const task = getDocument({ data: new Uint8Array(buf), disableFontFace: true, useSystemFonts: false, verbosity: 0 });
    try {
      const doc = await task.promise;
      let out = '';
      for (let i = 1; i <= Math.min(doc.numPages, MAX_PAGES); i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        out += content.items.map((it) => ('str' in it ? it.str : '')).join(' ') + '\n';
      }
      return out;
    } finally {
      await task.destroy();
    }
  } catch {
    return '';
  }
}
