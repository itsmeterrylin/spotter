import type { MapEntry, MapType } from '../db/repos/attributeMap.ts';
import type { Repos } from '../db/repos/index.ts';
import type { Project } from '../db/repos/project.ts';
import type { Json, JsonObject, TraceEvent } from '../db/types.ts';
import { notFound } from '../errors.ts';
import { urls } from '../urls.ts';

export type AttributeMapView = { project_id: string; project: string; map: MapEntry[]; url: string };

const isObject = (v: Json | undefined): v is JsonObject => typeof v === 'object' && v !== null && !Array.isArray(v);
const isScalar = (v: Json | undefined): v is string | number | boolean => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';

const rawValue = (entry: MapEntry, metadata: JsonObject | null, events: TraceEvent[] | null): Json | undefined => {
  const attrs = metadata?.attributes;
  if (isObject(attrs) && entry.source in attrs) return attrs[entry.source];
  const event = events?.find((e) => e.name === entry.source);
  if (!event) return undefined;
  return isScalar(event.data) ? event.data : event.at;
};

const coerce = (type: MapType, v: Json): Json | undefined => {
  if (type === 'string') return isScalar(v) ? String(v) : JSON.stringify(v);
  if (type === 'number') {
    const n = typeof v === 'boolean' ? Number(v) : isScalar(v) ? Number(v) : Number.NaN;
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === 'false') return v === 'true';
  return typeof v === 'number' ? v !== 0 : v !== null && v !== '';
};

export function promote(entries: MapEntry[], metadata: JsonObject | null, events: TraceEvent[] | null): JsonObject | null {
  let out = metadata;
  for (const entry of entries) {
    const raw = rawValue(entry, metadata, events);
    if (raw === undefined) continue;
    const value = coerce(entry.type, raw);
    if (value === undefined) continue;
    out = { ...(out ?? {}), [entry.target]: value };
  }
  return out;
}

const view = (repos: Repos, project: Project): AttributeMapView => ({
  project_id: project.id,
  project: project.name,
  map: repos.attributeMaps.list(project.id),
  url: urls.traces(),
});

export function getAttributeMap(repos: Repos, ref: string): AttributeMapView {
  const project = repos.projects.get(ref) ?? repos.projects.getByName(ref);
  if (!project) throw notFound('project', ref);
  return view(repos, project);
}

export function putAttributeMap(repos: Repos, ref: string, entries: MapEntry[]): AttributeMapView {
  const project = repos.projects.get(ref) ?? repos.projects.ensure(ref);
  repos.attributeMaps.replace(project.id, entries);
  return view(repos, project);
}
