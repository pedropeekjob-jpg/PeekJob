import { scrubText } from '@peekjob/shared';
import { ConsoleReporter, createReporter, SentryReporter, type ErrorEvent } from '../../src/monitoring/reporter';

const event: ErrorEvent = {
  platform: 'node',
  error: { type: 'TypeError', message: 'Falhou para ana@gmail.com com NIF 500697256', stack: 'TypeError: x\n    at f (/app/dist/x.js:10:5)' },
  route: 'GET /orgs/:id',
  requestId: 'r-123',
};

describe('scrubText: nada de dados pessoais nos relatórios de erro', () => {
  it.each([
    ['email de ana.silva@empresa.pt falhou', 'email de [email] falhou'],
    ['NIF 500697256 inválido', 'NIF [nif] inválido'],
    ['token=abcdefghijklmnopqrstuvwxyz0123456789ABCD', 'token=[token]'],
    ['https://peekjob.pt/entrar?token=abc&x=1', 'https://peekjob.pt/entrar'],
    ['telefone 912345678', 'telefone [nif]'],
  ])('%s', (input, out) => expect(scrubText(input)).toBe(out));
});

describe('Relatórios de erro', () => {
  it('Sentry: envia um envelope ao endpoint do DSN, com chave, ambiente e versão', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchFn = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;
    const r = new SentryReporter('https://pubkey@o123.ingest.de.sentry.io/456', { environment: 'uat', release: 'abc1234' }, fetchFn);
    await r.report(event);
    expect(calls[0].url).toBe('https://o123.ingest.de.sentry.io/api/456/envelope/');
    expect((calls[0].init.headers as Record<string, string>)['x-sentry-auth']).toMatch(/sentry_key=pubkey/);
    const [header, item, body] = String(calls[0].init.body).split('\n').map((l) => JSON.parse(l));
    expect(header.event_id).toMatch(/^[0-9a-f]{32}$/);
    expect(item.type).toBe('event');
    expect(body).toMatchObject({ platform: 'node', level: 'error', environment: 'uat', release: 'abc1234', transaction: 'GET /orgs/:id', tags: { request_id: 'r-123' } });
    expect(body.exception.values[0]).toMatchObject({ type: 'TypeError', value: 'Falhou para [email] com NIF [nif]' });
    expect(JSON.stringify(body)).not.toMatch(/ana@gmail|500697256/);
  });

  it('Sentry em baixo: não rebenta a aplicação', async () => {
    const fetchFn = (async () => {
      throw new Error('rede');
    }) as unknown as typeof fetch;
    await expect(new SentryReporter('https://k@o1.ingest.sentry.io/2', { environment: 'production', release: 'x' }, fetchFn).report(event)).resolves.toBeUndefined();
  });

  it('consola: uma linha JSON por erro (logs do Render), já sem dados pessoais', async () => {
    const lines: string[] = [];
    await new ConsoleReporter((l) => lines.push(l)).report(event);
    const j = JSON.parse(lines[0]);
    expect(j).toMatchObject({ level: 'error', route: 'GET /orgs/:id', requestId: 'r-123', type: 'TypeError' });
    expect(lines[0]).not.toMatch(/ana@gmail|500697256/);
  });

  it('Sentry quando há SENTRY_DSN; senão só a consola', () => {
    expect(createReporter({ SENTRY_DSN: 'https://k@o1.ingest.sentry.io/2' }).constructor.name).toBe('MultiReporter');
    expect(createReporter({})).toBeInstanceOf(ConsoleReporter);
    expect(() => createReporter({ SENTRY_DSN: 'não é um dsn' })).toThrow(/SENTRY_DSN/);
  });
});
