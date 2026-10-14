import { loadImage, createCanvas } from '@napi-rs/canvas';
import { dirname } from 'path';
import { createWorker, OEM, type Worker } from 'tesseract.js';

/**
 * Texto de uma fotografia (recibo ou contrato), com OCR no próprio servidor (Tesseract, dados de português
 * instalados com a app: nada sai para outros serviços). A imagem fica só em memória durante o pedido.
 */

/** Tipo pelo conteúdo (assinatura do ficheiro), não pelo nome nem pelo tipo que o browser diz */
export function fileKind(buf: Buffer): 'pdf' | 'jpeg' | 'png' | 'webp' | null {
  if (buf.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

/** Lado maior depois de reduzir: fotografias de telemóvel (4000 px) são lentas e não leem melhor */
export const MAX_SIDE = 2200;
export const scaleFor = (w: number, h: number) => Math.min(1, MAX_SIDE / Math.max(w, h));

async function normalize(buf: Buffer): Promise<Buffer> {
  const img = await loadImage(buf);
  const s = scaleFor(img.width, img.height);
  const c = createCanvas(Math.round(img.width * s), Math.round(img.height * s));
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0, c.width, c.height);
  return c.toBuffer('image/png');
}

const IDLE_MS = 60_000;
let worker: Promise<Worker> | null = null;
let idle: NodeJS.Timeout | undefined;

/** Um só "worker" de OCR, criado no primeiro pedido e desligado ao fim de 1 min sem uso (poupa memória) */
function getWorker() {
  worker ??= createWorker('por', OEM.LSTM_ONLY, {
    langPath: dirname(require.resolve('@tesseract.js-data/por/4.0.0_best_int/por.traineddata.gz')),
    cacheMethod: 'none',
    gzip: true,
  });
  return worker;
}
function scheduleIdle() {
  clearTimeout(idle);
  idle = setTimeout(() => void stopOcr(), IDLE_MS);
  idle.unref();
}

export async function stopOcr() {
  clearTimeout(idle);
  const w = worker;
  worker = null;
  if (w) await (await w).terminate().catch(() => undefined);
}

export async function imageText(buf: Buffer): Promise<string> {
  try {
    const img = await normalize(buf);
    const w = await getWorker();
    const { data } = await w.recognize(img, { rotateAuto: true });
    img.fill(0);
    return data.text;
  } catch {
    return '';
  } finally {
    scheduleIdle();
  }
}
