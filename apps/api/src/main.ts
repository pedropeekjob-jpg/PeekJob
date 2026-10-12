import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { corsOrigins } from './common/config';

export function configureApp(app: INestApplication) {
  app.enableCors({ origin: corsOrigins(), credentials: true });
  serveWeb(app, process.env.WEB_DIST);
  app.enableShutdownHooks();
}

/**
 * Em produção a API serve também a build da web (WEB_DIST): web e API na mesma origem,
 * o cookie de sessão é "first-party" e funciona no Safari/iPhone sem configurações extra.
 */
function serveWeb(app: INestApplication, dir: string | undefined) {
  if (!dir || !existsSync(join(dir, 'index.html'))) return;
  app.use(
    express.static(dir, {
      index: 'index.html',
      setHeaders: (res, path) => {
        // Ficheiros com hash no nome nunca mudam; o index muda em cada publicação.
        res.setHeader('cache-control', path.includes(`${join(dir, 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    }),
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API PeekJob na porta ${port}${process.env.WEB_DIST ? ' (com a web)' : ''}`);
}

if (require.main === module) void bootstrap();
