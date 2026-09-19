// Node charge nativement .env (>= v20.6) ; vitest ne le fait pas pour process.env
// (contrairement à prisma.config.ts qui le fait déjà pour la CLI Prisma).
try {
  process.loadEnvFile();
} catch {
  // pas de .env local, process.env peut déjà être renseigné autrement
}
