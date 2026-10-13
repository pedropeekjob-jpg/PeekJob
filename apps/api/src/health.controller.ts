import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Pool } from 'pg';
import { PG_POOL } from './db/db.module';
import { releaseOf } from './monitoring/reporter';

const started = Date.now();

/** Health check do alojamento e da verificação de disponibilidade: 503 se a base de dados não responder */
@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}
  @Get()
  async health(@Res({ passthrough: true }) res: Response) {
    let db: 'up' | 'down' = 'up';
    try {
      await Promise.race([this.pool.query('SELECT 1'), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))]);
    } catch {
      db = 'down';
      res.status(503);
    }
    res.setHeader('cache-control', 'no-store');
    return { ok: db === 'up', db, release: releaseOf(), uptimeSec: Math.round((Date.now() - started) / 1000) };
  }
}
