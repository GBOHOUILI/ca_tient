// Requis par les décorateurs class-validator/class-transformer (design:type via
// Reflect.getMetadata) ; en dehors des tests c'est src/main.ts qui l'importe.
import "reflect-metadata";

// Node charge nativement .env (>= v20.6) ; vitest ne le fait pas pour process.env
// (contrairement à prisma.config.ts qui le fait déjà pour la CLI Prisma).
try {
  process.loadEnvFile();
} catch {
  // pas de .env local, process.env peut déjà être renseigné autrement
}

import { resolveTestDatabaseUrl } from "./test/test-database-url.js";

// PrismaService reads DATABASE_URL: point it at the test database before any spec imports it.
process.env.DATABASE_URL = resolveTestDatabaseUrl(process.env);
