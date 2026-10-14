import { fileKind, MAX_SIDE, scaleFor } from '../../src/verification/image-text';

describe('fotografias de recibos: regras', () => {
  it('o tipo vê-se pelo conteúdo do ficheiro', () => {
    expect(fileKind(Buffer.from('%PDF-1.7 ...'))).toBe('pdf');
    expect(fileKind(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe('jpeg');
    expect(fileKind(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('png');
    expect(fileKind(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]))).toBe('webp');
    expect(fileKind(Buffer.from('GIF89a'))).toBeNull();
    expect(fileKind(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(fileKind(Buffer.alloc(0))).toBeNull();
  });

  it('fotografias grandes são reduzidas (lado maior até 2200 px); as pequenas ficam iguais', () => {
    expect(scaleFor(4000, 3000)).toBeCloseTo(MAX_SIDE / 4000);
    expect(scaleFor(3000, 4000)).toBeCloseTo(MAX_SIDE / 4000);
    expect(scaleFor(1200, 900)).toBe(1);
  });
});
