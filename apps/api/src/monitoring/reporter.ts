import { scrubText } from '@peekjob/shared';
import { randomUUID } from 'crypto';
import { appEnv } from '../common/config';

type Env = Record<string, string | undefined>;

export interface ErrorEvent {
  platform: 'node' | 'javascript';
  error: { type: string; message: string; stack?: string };
  /** rota-modelo ("GET /orgs/:id" ou "/org/:id"), nunca o caminho com ids ou query */
  route?: string;
  requestId?: string;
  release?: string;
}
export interface ErrorReporter {
  report(e: ErrorEvent): Promise<void>;
}
export const REPORTER = 'REPORTER';

export const releaseOf = (env: Env = process.env) => env.RENDER_GIT_COMMIT?.slice(0, 7) || 'dev';

/** Tira dados pessoais da mensagem e da stack; corta tamanhos */
export function scrubEvent(e: ErrorEvent): ErrorEvent {
  return {
    ...e,
    error: {
      type: scrubText(e.error.type).slice(0, 100),
      message: scrubText(e.error.message).slice(0, 500),
      stack: e.error.stack ? scrubText(e.error.stack).split('\n').slice(0, 30).join('\n').slice(0, 4000) : undefined,
    },
    route: e.route ? scrubText(e.route) : undefined,
  };
}

/** Uma linha JSON por erro: aparece nos logs do Render e pode ser filtrada por "level":"error" */
export class ConsoleReporter implements ErrorReporter {
  constructor(private readonly log: (line: string) => void = (l) => console.error(l)) {}
  async report(e: ErrorEvent) {
    const s = scrubEvent(e);
    this.log(
      JSON.stringify({
        level: 'error',
        time: new Date().toISOString(),
        platform: s.platform,
        type: s.error.type,
        message: s.error.message,
        route: s.route,
        requestId: s.requestId,
        release: s.release,
        stack: s.error.stack?.split('\n').slice(0, 8).join('\n'),
      }),
    );
  }
}

/** Uma linha de stack ("    at fn (ficheiro:10:5)", "at ficheiro:10:5" ou "fn@ficheiro:10:5"), sem regex com backtracking */
export function parseFrame(line: string): { function: string; filename: string; lineno: number; colno: number; in_app: boolean } | null {
  let l = line.trim();
  if (l.endsWith(')')) l = l.slice(0, -1);
  const m = /:(\d{1,7}):(\d{1,7})$/.exec(l);
  if (!m) return null;
  let head = l.slice(0, m.index);
  let fn = '?';
  if (head.startsWith('at ')) {
    head = head.slice(3);
    const open = head.lastIndexOf(' (');
    if (open >= 0) {
      fn = head.slice(0, open);
      head = head.slice(open + 2);
    }
  } else if (head.includes('@')) {
    const at = head.indexOf('@');
    fn = head.slice(0, at) || '?';
    head = head.slice(at + 1);
  } else return null;
  return { function: fn, filename: head, lineno: Number(m[1]), colno: Number(m[2]), in_app: !head.includes('node_modules') };
}

/** Frames no formato do Sentry (mais antigo primeiro) a partir de uma stack do V8/browser */
function frames(stack?: string) {
  if (!stack) return undefined;
  const out = stack.split('\n').map(parseFrame).filter((f): f is NonNullable<typeof f> => !!f);
  return out.length ? { frames: out.reverse() } : undefined;
}

/**
 * Sentry pela API de envelopes (sem SDK: controlamos exatamente o que sai).
 * Região UE: usar um projeto em de.sentry.io. Alertas por email configuram-se no Sentry.
 */
export class SentryReporter implements ErrorReporter {
  private readonly url: string;
  private readonly key: string;
  constructor(
    private readonly dsn: string,
    private readonly opts: { environment: string; release: string },
    private readonly fetchFn: typeof fetch = fetch,
  ) {
    const m = dsn.match(/^https:\/\/([^@/]+)@([^/]+)\/(\d+)$/);
    if (!m) throw new Error('SENTRY_DSN inválido (ex.: https://chave@o123.ingest.de.sentry.io/456)');
    this.key = m[1];
    this.url = `https://${m[2]}/api/${m[3]}/envelope/`;
  }

  async report(e: ErrorEvent) {
    const s = scrubEvent(e);
    const id = randomUUID().replace(/-/g, '');
    const event = {
      event_id: id,
      timestamp: Date.now() / 1000,
      platform: s.platform,
      level: 'error',
      environment: this.opts.environment,
      release: s.release ?? this.opts.release,
      transaction: s.route,
      tags: { request_id: s.requestId },
      exception: { values: [{ type: s.error.type, value: s.error.message, stacktrace: frames(s.error.stack) }] },
    };
    const body = [JSON.stringify({ event_id: id, sent_at: new Date().toISOString() }), JSON.stringify({ type: 'event' }), JSON.stringify(event)].join('\n');
    try {
      await this.fetchFn(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-sentry-envelope', 'x-sentry-auth': `Sentry sentry_version=7, sentry_key=${this.key}, sentry_client=peekjob/1.0` },
        body,
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // a monitorização nunca deita abaixo a aplicação
    }
  }
}

export class MultiReporter implements ErrorReporter {
  constructor(private readonly reporters: ErrorReporter[]) {}
  async report(e: ErrorEvent) {
    await Promise.all(this.reporters.map((r) => r.report(e)));
  }
}

/** Sempre nos logs; também no Sentry quando há SENTRY_DSN */
export function createReporter(env: Env = process.env): ErrorReporter {
  const console = new ConsoleReporter();
  if (!env.SENTRY_DSN) return console;
  return new MultiReporter([console, new SentryReporter(env.SENTRY_DSN.trim(), { environment: appEnv(env), release: releaseOf(env) })]);
}
