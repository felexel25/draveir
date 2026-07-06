// Carga web/.env en desarrollo local (sin dependencias, API nativa de Node).
// En CI no existe .env y las variables vienen del entorno: se ignora el error.
try {
  process.loadEnvFile('.env');
} catch {
  // Sin archivo .env: se usan las variables del entorno (p. ej. en CI).
}
