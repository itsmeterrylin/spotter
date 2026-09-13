export const config = {
  db: process.env.SPOTTER_DB ?? './data/spotter.sqlite',
  port: Number(process.env.SPOTTER_PORT ?? 3000),
  baseUrl: (process.env.SPOTTER_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
} as const;
