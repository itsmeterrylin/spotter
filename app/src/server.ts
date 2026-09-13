import { app } from './app.ts';
import { config } from './config.ts';

Bun.serve({ port: config.port, fetch: app.fetch });
console.log(`spotter listening on ${config.baseUrl}`);
