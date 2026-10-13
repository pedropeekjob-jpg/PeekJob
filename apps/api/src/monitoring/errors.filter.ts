import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request, Response } from 'express';
import { releaseOf, scrubEvent, type ErrorReporter } from './reporter';

/**
 * Erros inesperados: 500 com uma mensagem simples e o código do pedido (para o suporte),
 * e um relatório sem dados pessoais. Erros esperados (4xx) seguem o tratamento normal do Nest.
 */
@Catch()
export class ErrorsFilter extends BaseExceptionFilter {
  constructor(
    adapter: ConstructorParameters<typeof BaseExceptionFilter>[0],
    private readonly reporter: ErrorReporter,
  ) {
    super(adapter);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const req = host.switchToHttp().getRequest<Request>();
    const res = host.switchToHttp().getResponse<Response>();
    const status = statusOf(exception);
    if (status >= 500) {
      const err = exception instanceof Error ? exception : new Error(String(exception));
      void this.reporter.report(scrubEvent({
        platform: 'node',
        error: { type: err.name, message: err.message, stack: err.stack },
        route: `${req.method} ${(req.route as { path?: string } | undefined)?.path ?? req.path}`,
        requestId: res.locals.requestId,
        release: releaseOf(),
      }));
    }
    // HttpException e erros do Express com estado (ex.: 413 do body-parser): tratamento normal do Nest
    if (exception instanceof HttpException || status < 500) return super.catch(exception, host);
    res.status(500).json({ statusCode: 500, message: 'Algo correu mal. Tenta outra vez.', requestId: res.locals.requestId });
  }
}

/** Estado HTTP de uma exceção: HttpException, erros do Express/http-errors (status/statusCode) ou 500 */
function statusOf(e: unknown): number {
  if (e instanceof HttpException) return e.getStatus();
  const s = (e as { status?: unknown; statusCode?: unknown } | null)?.status ?? (e as { statusCode?: unknown } | null)?.statusCode;
  return typeof s === 'number' && s >= 400 && s < 600 ? s : 500;
}
