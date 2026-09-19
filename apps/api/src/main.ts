// Requis par les décorateurs class-validator/class-transformer (design:type via Reflect.getMetadata),
// doit être importé avant tout DTO décoré.
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
