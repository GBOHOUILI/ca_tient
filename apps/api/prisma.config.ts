import { defineConfig, env } from "prisma/config";

// Prisma 7 ne charge plus .env automatiquement pour la CLI (config-based setup).
// Node charge nativement le fichier .env (>= v20.6) — pas besoin de la dépendance `dotenv`.
try {
  process.loadEnvFile();
} catch {
  // pas de .env local (ex: avant `cp .env.example .env`) — process.env peut déjà être renseigné autrement
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
