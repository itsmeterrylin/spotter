import { createApp } from './app.ts';
import { config } from './config.ts';
import { openDatabase } from './db/client.ts';

const app = createApp(openDatabase(config.db));

Bun.serve({ port: config.port, fetch: app.fetch });
console.log(`spotter listening on ${config.baseUrl}`);
