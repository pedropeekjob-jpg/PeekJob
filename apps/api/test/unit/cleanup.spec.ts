import type { Pool } from 'pg';
import { CleanupService } from '../../src/housekeeping/cleanup.service';

/** A ronda periódica: arranca com a app, não se sobrepõe e uma falha não derruba a API */
describe('CleanupService (ronda periódica)', () => {
  const env = process.env.CLEANUP_INTERVAL_MIN;
  afterEach(() => {
    if (env === undefined) delete process.env.CLEANUP_INTERVAL_MIN;
    else process.env.CLEANUP_INTERVAL_MIN = env;
  });

  it('com intervalo, corre logo ao arrancar e para no encerramento', async () => {
    process.env.CLEANUP_INTERVAL_MIN = '60';
    const query = jest.fn().mockResolvedValue({ rowCount: 2 });
    const svc = new CleanupService({ query } as unknown as Pool);
    svc.onApplicationBootstrap();
    await svc.onApplicationShutdown();
    expect(query).toHaveBeenCalledTimes(4);
  });

  it('uma ronda que falha fica no log e não lança', async () => {
    process.env.CLEANUP_INTERVAL_MIN = '60';
    const svc = new CleanupService({ query: jest.fn().mockRejectedValue(new Error('sem base de dados')) } as unknown as Pool);
    const error = jest.spyOn((svc as unknown as { log: { error: () => void } }).log, 'error').mockImplementation(() => undefined);
    svc.onApplicationBootstrap();
    await svc.onApplicationShutdown();
    expect(error).toHaveBeenCalledWith('Ronda falhou: sem base de dados');
  });

  it('com 0, não agenda nada', async () => {
    process.env.CLEANUP_INTERVAL_MIN = '0';
    const query = jest.fn();
    const svc = new CleanupService({ query } as unknown as Pool);
    svc.onApplicationBootstrap();
    await svc.onApplicationShutdown();
    expect(query).not.toHaveBeenCalled();
  });
});
