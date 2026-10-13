import { afterEach, describe, expect, it, vi } from 'vitest';
import { deletedText, deleteLabel, downloadLabel, KEPT } from '../../src/features/account/myData';
import { saveBlob } from '../../src/lib/download';

describe('os teus dados: textos', () => {
  it('o que guardamos e o que acontece ao apagar', () => {
    expect(KEPT()).toHaveLength(4);
    expect(deletedText(true)).toMatch(/continuam publicadas/);
    expect(deletedText(false)).toMatch(/^Apagámos também/);
  });

  it('botões mostram o que está a acontecer', () => {
    expect(downloadLabel(null)).toBe('Descarregar');
    expect(downloadLabel('export')).toBe('A preparar…');
    expect(downloadLabel('delete')).toBe('Descarregar');
    expect(deleteLabel('delete')).toBe('A apagar…');
    expect(deleteLabel(null)).toBe('Apagar definitivamente');
  });
});

describe('saveBlob', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('descarrega por uma ligação temporária e liberta o URL depois', () => {
    vi.useFakeTimers();
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:y'), revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    saveBlob(new Blob(['{}']), 'dados.json');
    const a = click.mock.contexts[0] as HTMLAnchorElement;
    expect(a.download).toBe('dados.json');
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledWith('blob:y');
  });
});
