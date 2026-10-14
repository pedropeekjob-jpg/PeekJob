import { UnsupportedMediaTypeException } from '@nestjs/common';
import { fileKind, imageText } from './image-text';
import { fixOcrDigits } from './nif-extract';
import { pdfText } from './pdf-text';

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

/**
 * Texto de um PDF ou fotografia, só em memória; o conteúdo do ficheiro é apagado no fim.
 * O tipo vê-se pelo conteúdo (assinatura do ficheiro), não pelo que o browser diz.
 */
export async function documentText(file: Express.Multer.File | undefined, hint: string) {
  const kind = file ? fileKind(file.buffer) : null;
  if (!file || !kind) throw new UnsupportedMediaTypeException(hint);
  try {
    return kind === 'pdf' ? await pdfText(file.buffer) : fixOcrDigits(await imageText(file.buffer));
  } finally {
    file.buffer.fill(0);
  }
}
