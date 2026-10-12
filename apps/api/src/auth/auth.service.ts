import { HttpException, HttpStatus, Inject, Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Pool } from 'pg';
import { webOrigin } from '../common/config';
import { PG_POOL, tx } from '../db/db.module';
import { emailHash, normalizeEmail, randomToken, sha256 } from './crypto';
import { MAILER, type Mailer } from './mailer';

export const LOGIN_TOKEN_MINUTES = 15;
export const MAX_LINKS_PER_WINDOW = 3;
export const SESSION_DAYS = 30;

export interface AuthUser {
  id: string;
  role: 'user' | 'moderator';
}

@Injectable()
export class AuthService {
  private readonly log = new Logger('Auth');
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  async requestLink(rawEmail: string) {
    const email = normalizeEmail(rawEmail);
    const eh = emailHash(email);
    const recent = await this.pool.query(
      `SELECT count(*)::int AS n FROM login_tokens WHERE email_hash = $1 AND created_at > now() - make_interval(mins => $2)`,
      [eh, LOGIN_TOKEN_MINUTES],
    );
    if (recent.rows[0].n >= MAX_LINKS_PER_WINDOW) {
      throw new HttpException('Demasiados pedidos. Tenta daqui a uns minutos.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const token = randomToken();
    await this.pool.query(
      `INSERT INTO login_tokens (token_hash, email_hash, expires_at) VALUES ($1, $2, now() + make_interval(mins => $3))`,
      [sha256(token), eh, LOGIN_TOKEN_MINUTES],
    );
    const link = `${webOrigin()}/#/entrar?token=${token}`;
    try {
      await this.mailer.send({
      to: email,
      subject: 'O teu link de acesso à PeekJob',
        text: `Olá! Abre este link para entrar na PeekJob (válido durante ${LOGIN_TOKEN_MINUTES} minutos):\n${link}\n\nSe não pediste este email, podes ignorá-lo.`,
        link,
      });
    } catch (e) {
      // O link não chegou: não conta para o limite de pedidos.
      await this.pool.query('DELETE FROM login_tokens WHERE token_hash = $1', [sha256(token)]);
      this.log.error(`Falha no envio do link: ${(e as Error).message}`);
      throw new ServiceUnavailableException('Não foi possível enviar o email. Tenta outra vez daqui a pouco.');
    }
  }

  /** Troca um link mágico (uso único) por uma sessão. Devolve o id da sessão para o cookie. */
  async verify(token: string): Promise<{ user: AuthUser; sessionId: string }> {
    return tx(this.pool, async (c) => {
      const t = await c.query(
        `UPDATE login_tokens SET used_at = now()
          WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
          RETURNING email_hash`,
        [sha256(token)],
      );
      if (!t.rows[0]) throw new UnauthorizedException('Link inválido ou expirado. Pede um novo.');
      const u = await c.query(
        `INSERT INTO users (email_hash, last_login_at) VALUES ($1, now())
         ON CONFLICT (email_hash) DO UPDATE SET last_login_at = now()
         RETURNING id, role`,
        [t.rows[0].email_hash],
      );
      const sessionId = randomToken();
      await c.query(
        `INSERT INTO sessions (id_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))`,
        [sha256(sessionId), u.rows[0].id, SESSION_DAYS],
      );
      return { user: u.rows[0], sessionId };
    });
  }

  async userForSession(sessionId: string | undefined): Promise<AuthUser | null> {
    if (!sessionId) return null;
    const { rows } = await this.pool.query(
      `SELECT u.id, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id_hash = $1 AND s.expires_at > now()`,
      [sha256(sessionId)],
    );
    return rows[0] ?? null;
  }

  async logout(sessionId: string | undefined) {
    if (sessionId) await this.pool.query('DELETE FROM sessions WHERE id_hash = $1', [sha256(sessionId)]);
  }
}
