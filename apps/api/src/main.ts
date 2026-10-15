import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { randomUUID } from 'crypto';
import { ErrorsFilter } from './monitoring/errors.filter';
import { REPORTER } from './monitoring/reporter';
import { NestFactory } from '@nestjs/core';
import { routeTemplate } from '@peekjob/shared';
import express, { type NextFunction, type Request, type Response } from 'express';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { appEnv, corsOrigins } from './common/config';
import { loadLocalEnv } from './common/local-env';
import { htmlCsp } from './security/headers';
import { applySecurity } from './security/security';
import { protectEnvironment } from './web/environment';
import { configScript, renderIndex } from './web/index-html';

export function configureApp(app: INestApplication) {
  // Atrás do proxy do alojamento: o IP real vem em X-Forwarded-For (limites por IP nas denúncias)
  if (process.env.APP_ENV) (app.getHttpAdapter().getInstance() as { set: (k: string, v: unknown) => void }).set('trust proxy', 1);
  // Código de cada pedido: vai nas respostas e nos relatórios de erro (a pessoa pode indicá-lo ao suporte)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.locals.requestId = randomUUID();
    res.setHeader('x-request-id', res.locals.requestId);
    next();
  });
  app.useGlobalFilters(new ErrorsFilter(app.get(HttpAdapterHost).httpAdapter, app.get(REPORTER)));
  protectEnvironment(app);
  applySecurity(app);
  app.enableCors({ origin: corsOrigins(), credentials: true });
  serveWeb(app, process.env.WEB_DIST);
  app.enableShutdownHooks();
}

/**
 * Em produção a API serve também a build da web (WEB_DIST): web e API na mesma origem,
 * o cookie de sessão é "first-party" e funciona no Safari/iPhone sem configurações extra.
 * URLs da web sem # (indexáveis): a navegação do browser (Accept: text/html) recebe o index;
 * caminhos que não existem recebem o index com 404 (a web mostra a página "não encontrada").
 */
function serveWeb(app: INestApplication, dir: string | undefined) {
  if (!dir || !existsSync(join(dir, 'index.html'))) return;
  const template = readFileSync(join(dir, 'index.html'), 'utf8');
  const sendIndex = (req: Request, res: Response, status = 200) =>
    res
      .status(status)
      .setHeader('cache-control', 'no-cache')
      .setHeader('content-security-policy', htmlCsp(appEnv()))
      .type('html')
      .send(renderIndex(template, process.env, req.query.lang === 'en' ? 'en' : 'pt'));

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && (req.path === '/' || req.path === '/index.html')) return sendIndex(req, res);
    // Configuração da web (GA, ambiente) num ficheiro e não inline: permite uma CSP sem 'unsafe-inline'
    if (req.method === 'GET' && req.path === '/pj-config.js') {
      return res.status(200).setHeader('cache-control', 'no-cache').type('application/javascript').send(configScript(process.env));
    }
    next();
  });
  app.use(
    express.static(dir, {
      index: false,
      setHeaders: (res, path) => {
        // Ficheiros com hash no nome nunca mudam; os restantes (ícones, manifest) revalidam.
        res.setHeader('cache-control', path.includes(join(dir, 'assets')) ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    }),
  );
  app.use((req: Request, res: Response, next: NextFunction) => {
    const wantsHtml = req.method === 'GET' && (req.headers.accept ?? '').includes('text/html');
    if (!wantsHtml || req.path.includes('.')) return next();
    sendIndex(req, res, routeTemplate(req.path) === '/404' ? 404 : 200);
  });
}

async function bootstrap() {
  // desenvolvimento: DATABASE_URL e companhia vêm do .env.local escrito pelo `neon deploy`
  loadLocalEnv();
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API PeekJob na porta ${port}${process.env.WEB_DIST ? ' (com a web)' : ''}`);
}

if (require.main === module) void bootstrap();
