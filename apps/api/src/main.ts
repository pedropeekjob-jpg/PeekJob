import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { routeTemplate } from '@peekjob/shared';
import express, { type NextFunction, type Request, type Response } from 'express';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { corsOrigins } from './common/config';
import { renderIndex } from './web/index-html';

export function configureApp(app: INestApplication) {
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
  const sendIndex = (res: Response, status = 200) =>
    res.status(status).setHeader('cache-control', 'no-cache').type('html').send(renderIndex(template));

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && (req.path === '/' || req.path === '/index.html')) return sendIndex(res);
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
    sendIndex(res, routeTemplate(req.path) === '/404' ? 404 : 200);
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API PeekJob na porta ${port}${process.env.WEB_DIST ? ' (com a web)' : ''}`);
}

if (require.main === module) void bootstrap();
