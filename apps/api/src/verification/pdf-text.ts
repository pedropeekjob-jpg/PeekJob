/* eslint-disable @typescript-eslint/no-var-requires */
// pdf.js (build legacy, CommonJS): extrai o texto sem renderizar; o ficheiro nunca é escrito em disco.
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

const MAX_PAGES = 10;

export async function pdfText(buf: Buffer): Promise<string> {
  try {
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(buf),
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
      verbosity: 0,
    }).promise;
    let out = '';
    for (let i = 1; i <= Math.min(doc.numPages, MAX_PAGES); i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map((it: { str?: string }) => it.str ?? '').join(' ') + '\n';
    }
    await doc.destroy();
    return out;
  } catch {
    return '';
  }
}
