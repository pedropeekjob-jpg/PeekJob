import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db/db.module';
import { GEOCODER, type Geocoder } from './geocoder';

const MAX_ATTEMPTS = 3;
const BATCH = 20;

/**
 * Dá coordenadas aos locais que não as têm (adicionados à mão), para entrarem no mapa real.
 * Corre logo que se adiciona uma organização (`kick`) e numa ronda periódica; um pedido por segundo
 * (regra do Nominatim); morada não encontrada: tenta de novo no dia seguinte, no máximo 3 vezes.
 */
@Injectable()
export class GeocodingService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly log = new Logger('Geocoding');
  private running: Promise<void> | null = null;
  private again = false;
  private timer?: NodeJS.Timeout;
  /** Intervalo entre pedidos (ms); nos testes 0 */
  private readonly gapMs = process.env.NODE_ENV === 'test' ? 0 : 1100;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(GEOCODER) private readonly geocoder: Geocoder,
  ) {}

  onApplicationBootstrap() {
    const minutes = Number(process.env.GEOCODE_INTERVAL_MIN ?? (process.env.NODE_ENV === 'test' ? 0 : 15));
    if (minutes > 0) {
      this.timer = setInterval(() => this.kick(), minutes * 60_000);
      this.timer.unref();
      this.kick();
    }
  }

  async onApplicationShutdown() {
    clearInterval(this.timer);
    await this.idle();
  }

  /** Pede uma ronda sem esperar por ela (ex.: depois de adicionar uma organização) */
  kick() {
    if (this.running) {
      this.again = true;
      return;
    }
    this.running = this.loop().finally(() => (this.running = null));
  }

  /** Espera que a ronda em curso acabe (testes e encerramento) */
  async idle() {
    while (this.running) await this.running;
  }

  private async loop() {
    do {
      this.again = false;
      await this.runOnce().catch((e) => this.log.error(`Ronda falhou: ${(e as Error).message}`));
    } while (this.again);
  }

  /** Uma ronda: até 20 locais sem coordenadas cuja hora de tentar já chegou */
  async runOnce() {
    const { rows } = await this.pool.query(
      `SELECT l.id, l.address, coalesce(l.city, o.city) AS city FROM org_locations l JOIN organizations o ON o.id = l.org_id
        WHERE l.lat IS NULL AND l.geocode_attempts < $1 AND (l.geocode_next_at IS NULL OR l.geocode_next_at <= now())
          AND o.status <> 'rejected'
        ORDER BY l.created_at LIMIT $2`,
      [MAX_ATTEMPTS, BATCH],
    );
    for (const [i, l] of rows.entries()) {
      if (i > 0 && this.gapMs) await new Promise((r) => setTimeout(r, this.gapMs));
      const r = await this.geocoder.geocode(l.address, l.city);
      if (r === 'unavailable') {
        await this.pool.query(`UPDATE org_locations SET geocode_next_at = now() + interval '1 hour' WHERE id = $1`, [l.id]);
        continue;
      }
      if (r === null) {
        await this.pool.query(
          `UPDATE org_locations SET geocode_attempts = geocode_attempts + 1, geocode_next_at = now() + interval '1 day' WHERE id = $1`,
          [l.id],
        );
        continue;
      }
      await this.pool.query(
        `UPDATE org_locations SET lat = $2, lng = $3, geocoded_at = now(), geocode_source = 'nominatim', geocode_next_at = NULL WHERE id = $1`,
        [l.id, r.lat, r.lng],
      );
    }
  }
}
