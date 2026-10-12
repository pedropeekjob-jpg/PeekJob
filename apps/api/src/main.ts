import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export function configureApp(app: INestApplication) {
  app.enableCors({ origin: (process.env.WEB_ORIGIN ?? 'http://localhost:5173').split(','), credentials: true });
  app.enableShutdownHooks();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API PeekJob em http://localhost:${port}`);
}

if (require.main === module) void bootstrap();
