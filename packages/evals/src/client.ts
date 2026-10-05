export type ClientConfig = { url: string; token?: string };

export type ApiClient = {
  base: string;
  get: (path: string) => Promise<unknown>;
  post: (path: string, body: unknown) => Promise<unknown>;
  put: (path: string, body: unknown) => Promise<unknown>;
  patch: (path: string, body: unknown) => Promise<unknown>;
};

export const configFromEnv = (env: Record<string, string | undefined> = process.env): ClientConfig => ({
  url: (env.SPOTTER_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  token: env.SPOTTER_AUTH_TOKEN,
});

const errorMessage = (body: unknown): string | null => {
  if (typeof body !== 'object' || body === null) return null;
  const error = (body as { error?: { message?: unknown } }).error;
  return typeof error?.message === 'string' ? error.message : null;
};

export function createClient(config: ClientConfig): ApiClient {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (config.token) headers.authorization = `Bearer ${config.token}`;

  const call = async (method: string, path: string, body?: unknown): Promise<unknown> => {
    const url = `${config.url}${path}`;
    let res: Response;
    try {
      res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (err) {
      throw new Error(`cannot reach spotter at ${config.url}: ${err instanceof Error ? err.message : String(err)}`);
    }
    const text = await res.text();
    const parsed: unknown = text ? JSON.parse(text) : null;
    if (res.ok) return parsed;
    throw new Error(`${method} ${path} failed with ${res.status}: ${errorMessage(parsed) ?? text}`);
  };

  return {
    base: config.url,
    get: (path) => call('GET', path),
    post: (path, body) => call('POST', path, body),
    put: (path, body) => call('PUT', path, body),
    patch: (path, body) => call('PATCH', path, body),
  };
}
