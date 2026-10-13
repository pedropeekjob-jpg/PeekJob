import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { routeTemplate } from '@peekjob/shared';
import { z } from 'zod';
import { parse } from '../common/zod';
import { REPORTER, scrubEvent, type ErrorReporter } from './reporter';

const ClientError = z.object({
  message: z.string().trim().min(1).max(500),
  type: z.string().trim().max(100).default('Error'),
  stack: z.string().max(4000).optional(),
  path: z.string().max(300).default('/'),
  release: z.string().max(40).optional(),
});

/** Erros do browser (a web não carrega nenhum SDK de terceiros; a API decide o que sai e para onde) */
@Controller('client-errors')
export class ClientErrorsController {
  constructor(@Inject(REPORTER) private readonly reporter: ErrorReporter) {}

  @Post()
  @HttpCode(204)
  async report(@Body() body: unknown) {
    const b = parse(ClientError, body);
    await this.reporter.report(scrubEvent({
      platform: 'javascript',
      error: { type: b.type, message: b.message, stack: b.stack },
      route: routeTemplate(b.path),
      release: b.release,
    }));
  }
}
