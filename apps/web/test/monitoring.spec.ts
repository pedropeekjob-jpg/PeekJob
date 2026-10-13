import { describe, expect, it } from 'vitest';
import { createErrorSender } from '../src/lib/monitoring';

describe('erros do browser enviados à API', () => {
  const setup = () => {
    const sent: Record<string, unknown>[] = [];
    const send = createErrorSender((body) => void sent.push(body), { release: 'abc1234', max: 3 });
    return { sent, send };
  };

  it('envia mensagem, tipo, stack e só o caminho (sem query nem #)', () => {
    const { sent, send } = setup();
    const e = new TypeError('x is undefined');
    send(e, 'https://peekjob.pt/org/3f2a?token=abc#x');
    expect(sent[0]).toMatchObject({ message: 'x is undefined', type: 'TypeError', path: '/org/3f2a', release: 'abc1234' });
    expect(typeof sent[0].stack).toBe('string');
  });

  it('não repete o mesmo erro e para ao fim de alguns por página', () => {
    const { sent, send } = setup();
    for (let i = 0; i < 3; i++) send(new Error('igual'), 'https://x/');
    for (let i = 0; i < 5; i++) send(new Error('erro ' + i), 'https://x/');
    expect(sent.map((s) => s.message)).toEqual(['igual', 'erro 0', 'erro 1']);
  });

  it('ignora ruído: extensões do browser, ResizeObserver e scripts de outros sites', () => {
    const { sent, send } = setup();
    const ext = new Error('boom');
    ext.stack = 'Error: boom\n at chrome-extension://abc/content.js:1:1';
    send(ext, 'https://x/');
    send(new Error('ResizeObserver loop completed with undelivered notifications.'), 'https://x/');
    send('Script error.', 'https://x/');
    expect(sent).toHaveLength(0);
  });
});
