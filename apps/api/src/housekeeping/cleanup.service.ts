import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db/db.module';

/**
 * Apaga os dados de acesso que já passaram do prazo (só existem em hash, mas não precisam de ficar):
 * links de entrada, sessões e códigos de verificação e de reivindicação expirados.
 * Os links ficam mais um dia porque o limite de pedidos conta os dos últimos 15 minutos.
 * Corre ao arrancar e a cada hora (`CLEANUP_INTERVAL_MIN`; 0 desliga).
 */
@Injectable()
export class CleanupService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly log = new Logger('Limpeza');
  private timer?: NodeJS.Timeout;
  private running: Promise<unknown> | null = null;

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  onApplicationBootstrap() {
    const minutes = Number(process.env.CLEANUP_INTERVAL_MIN ?? (process.env.NODE_ENV === 'test' ? 0 : 60));
    if (minutes > 0) {
      this.timer = setInterval(() => this.kick(), minutes * 60_000);
      this.timer.unref();
      this.kick();
    }
  }

  async onApplicationShutdown() {
    clearInterval(this.timer);
    await this.running;
  }

  private kick() {
    if (this.running) return;
    this.running = this.runOnce()
      .catch((e) => this.log.error(`Ronda falhou: ${(e as Error).message}`))
      .finally(() => (this.running = null));
  }

  /** Uma ronda; devolve quantas linhas apagou em cada tabela */
  async runOnce() {
    const del = async (sql: string) => (await this.pool.query(sql)).rowCount ?? 0;
    const r = {
      loginTokens: await del(`DELETE FROM login_tokens WHERE expires_at < now() - interval '1 day'`),
      sessions: await del(`DELETE FROM sessions WHERE expires_at < now()`),
      verificationCodes: await del(`DELETE FROM verification_codes WHERE expires_at < now()`),
      claimCodes: await del(`DELETE FROM org_claim_codes WHERE expires_at < now()`),
    };
    const total = r.loginTokens + r.sessions + r.verificationCodes + r.claimCodes;
    if (total) this.log.log(`Apagados: ${r.loginTokens} links, ${r.sessions} sessões, ${r.verificationCodes + r.claimCodes} códigos`);
    return r;
  }
}
