// Requis par les décorateurs class-validator/class-transformer (design:type via Reflect.getMetadata),
// doit être importé avant tout DTO décoré.
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { parseTrustProxy } from './trust-proxy.js';

// Node charge nativement .env (>= v20.6) ; ni Nest ni ce fichier ne le faisaient
// jusqu'ici (seul prisma.config.ts le fait, pour la CLI Prisma uniquement).
try {
  process.loadEnvFile();
} catch {
  // pas de .env local, process.env peut déjà être renseigné autrement
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  if (trustProxy !== undefined) {
    app.set('trust proxy', trustProxy);
  }
  app.enableCors({ origin: process.env.WEB_APP_URL ?? 'http://localhost:3000' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
