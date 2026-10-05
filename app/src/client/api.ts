type ApiError = { error?: { message?: string } };

async function patch(url: string, body: Record<string, unknown>): Promise<string | null> {
  const res = await fetch(url, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (res.ok) return null;
  const err = (await res.json().catch(() => ({}))) as ApiError;
  return err.error?.message ?? `HTTP ${res.status}`;
}

/** PATCH an issue; resolves to an error message, or null on success. */
export const patchIssue = (id: string, body: Record<string, unknown>): Promise<string | null> => patch(`/api/issues/${encodeURIComponent(id)}`, body);

/** PATCH a judge's state; resolves to an error message, or null on success. */
export const patchJudge = (name: string, body: Record<string, unknown>): Promise<string | null> => patch(`/api/judges/${encodeURIComponent(name)}`, body);
