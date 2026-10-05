type ApiError = { error?: { message?: string } };

async function send(method: string, url: string, body: Record<string, unknown>): Promise<string | null> {
  const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (res.ok) return null;
  const err = (await res.json().catch(() => ({}))) as ApiError;
  return err.error?.message ?? `HTTP ${res.status}`;
}

/** PATCH an issue; resolves to an error message, or null on success. */
export const patchIssue = (id: string, body: Record<string, unknown>): Promise<string | null> => send('PATCH', `/api/issues/${encodeURIComponent(id)}`, body);

/** PATCH a judge's state; resolves to an error message, or null on success. */
export const patchJudge = (name: string, body: Record<string, unknown>): Promise<string | null> => send('PATCH', `/api/judges/${encodeURIComponent(name)}`, body);

/** Make a version the judge's active one; resolves to an error message, or null on success. */
export const activateVersion = (name: string, version: number): Promise<string | null> => send('POST', `/api/judges/${encodeURIComponent(name)}/activate`, { version });
