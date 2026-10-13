import { Controller, Get, NotFoundException } from '@nestjs/common';
import { REPORTER, type ErrorEvent, type ErrorReporter } from '../../src/monitoring/reporter';
import { createTestApp, resetDb, TestCtx } from '../helpers';

@Controller('__test')
class BoomController {
  @Get('boom/:id')
  boom() {
    throw new Error('rebentou ao ler ana@gmail.com');
  }
  @Get('missing')
  missing() {
    throw new NotFoundException();
  }
}

/** Monitorização: cada erro 5xx é reportado sem dados pessoais e a pessoa recebe um código para o suporte. */
describe('Monitorização', () => {
  let t: TestCtx;
  const events: ErrorEvent[] = [];
  const reporter: ErrorReporter = { report: async (e) => void events.push(e) };
  beforeAll(async () => {
    t = await createTestApp({ [REPORTER]: reporter }, { controllers: [BoomController] });
  });
  afterAll(async () => {
    await t.pool.end();
    await t.app.close();
  });
  beforeEach(async () => {
    await resetDb(t);
    events.length = 0;
  });

  it('todas as respostas levam um código de pedido (X-Request-Id)', async () => {
    const res = await t.http().get('/orgs').expect(200);
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('erro inesperado: 500 com mensagem simples e o código; o relatório leva a rota-modelo, sem dados pessoais nem cookies', async () => {
    const cookie = await t.login('ana');
    const res = await t.http().get('/__test/boom/123?email=ana@gmail.com').set(cookie).expect(500);
    expect(res.body).toEqual({ statusCode: 500, message: 'Algo correu mal. Tenta outra vez.', requestId: res.headers['x-request-id'] });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ platform: 'node', route: 'GET /__test/boom/:id', requestId: res.headers['x-request-id'] });
    expect(events[0].error.message).toBe('rebentou ao ler [email]');
    expect(JSON.stringify(events[0])).not.toMatch(/pj_session|ana@gmail|123\?/);
  });

  it('erros esperados (4xx) não são reportados', async () => {
    await t.http().get('/__test/missing').expect(404);
    await t.http().post('/orgs').send({}).expect(401);
    expect(events).toHaveLength(0);
  });

  describe('erros da web (POST /client-errors)', () => {
    const send = (body: Record<string, unknown>) => t.http().post('/client-errors').send(body);

    it('recebe o erro do browser e reporta-o sem dados pessoais (204)', async () => {
      await send({ message: 'Cannot read x of undefined (joao@x.pt)', stack: 'TypeError: …\n at a (https://peekjob.pt/assets/index-1.js:1:2)', path: '/org/3f2a?token=abc', release: 'abc1234' }).expect(204);
      expect(events[0]).toMatchObject({ platform: 'javascript', route: '/org/:id', release: 'abc1234' });
      expect(events[0].error.message).toBe('Cannot read x of undefined ([email])');
      expect(JSON.stringify(events[0])).not.toMatch(/joao@x|token=abc/);
    });

    it('valida e limita (400 sem mensagem; 20 por 10 minutos por IP)', async () => {
      await send({}).expect(400);
      for (let i = 0; i < 19; i++) await send({ message: 'e' + i, path: '/' }).expect(204); // o pedido inválido também conta
      await send({ message: 'mais', path: '/' }).expect(429);
    });
  });

  describe('/health', () => {
    it('diz se a base de dados responde, a versão e há quanto tempo está ligada', async () => {
      const res = await t.http().get('/health').expect(200);
      expect(res.body).toMatchObject({ ok: true, db: 'up', release: expect.any(String) });
      expect(res.body.uptimeSec).toBeGreaterThanOrEqual(0);
    });
  });
});
