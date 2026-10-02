type ApiError = { error?: { message?: string } };

/** PATCH an issue; resolves to an error message, or null on success. */
export async function patchIssue(id: string, body: Record<string, unknown>): Promise<string | null> {
  const res = await fetch(`/api/issues/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (res.ok) return null;
  const err = (await res.json().catch(() => ({}))) as ApiError;
  return err.error?.message ?? `HTTP ${res.status}`;
}
