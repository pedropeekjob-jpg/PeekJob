import { describe, expect, it } from 'vitest';
import { decisionNotice, keepTemplates, orgDetails, reasonLabel, rejectTemplates, removeTemplates, reportsText, reviewersText, sinceIso } from '../../src/features/moderation/moderation';

describe('moderação: regras e textos', () => {
  it('há quanto tempo, a partir de uma data ISO', () => {
    const now = Date.parse('2026-10-13T12:00:00Z');
    expect(sinceIso('2026-10-13T08:00:00Z', now)).toBe('hoje');
    expect(sinceIso('2026-10-12T08:00:00Z', now)).toBe('ontem');
    expect(sinceIso('2026-10-10T12:00:00Z', now)).toMatch(/3 dias/);
  });

  it('motivos: os conhecidos, ilegal e outro', () => {
    expect(reasonLabel('nome')).toBe('Identifica uma pessoa');
    expect(reasonLabel('ilegal')).toBe('Possível ilegalidade');
    expect(reasonLabel('qualquer')).toBe('Outro motivo');
  });

  it('modelos de justificação únicos (são chaves) e com tamanho suficiente', () => {
    const all = [...removeTemplates(), ...keepTemplates(), ...rejectTemplates()];
    expect(new Set(all).size).toBe(all.length);
    expect(all.every((t) => t.length >= 10)).toBe(true);
  });

  it('avisos e contagens', () => {
    expect(decisionNotice('remove')).toMatch(/^Avaliação removida/);
    expect(decisionNotice('keep')).toMatch(/^Avaliação mantida/);
    expect(reportsText(1)).toBe('1 denúncia');
    expect(reviewersText(0)).toBe('Ainda sem avaliações');
    expect(reviewersText(2)).toBe('2 pessoas já avaliaram');
    expect(orgDetails('PME', { city: 'Faro', address: null, nif: null })).toBe('PME · Faro');
    expect(orgDetails('PME', { city: 'Faro', address: 'Rua A', nif: '500697256' })).toBe('PME · Faro · Rua A · NIF 500697256');
  });
});
