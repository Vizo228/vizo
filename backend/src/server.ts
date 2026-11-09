import { buildApp } from './app.js';
import { readEnv } from './config/env.js';

const env = readEnv();
const app = buildApp(env);

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
}
