import { describe, expect, test } from 'bun:test';
import { uuid7 } from '@spotter/evals/uuid7';
import { openDatabase } from '../src/db/client.ts';
import { createRepos } from '../src/db/repos/index.ts';

const tables = ['project', 'dataset', 'dataset_item', 'run', 'trace', 'judge', 'judge_version', 'score', 'judge_calibration', 'attribute_map', 'alert_rule', 'alert_delivery'];

describe('schema', () => {
  test('creates all twelve tables on an in-memory database and is idempotent', () => {
    const db = openDatabase(':memory:');
    const names = db.query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((r) => r.name);
    expect(names.sort()).toEqual([...tables].sort());
    const schema = db.query<{ sql: string }, []>("SELECT sql FROM sqlite_master WHERE name = 'trace'").get()?.sql;
    expect(schema).toContain('"end"');
    expect(() => openDatabase(':memory:')).not.toThrow();
  });
});

describe('repositories', () => {
  const repos = createRepos(openDatabase(':memory:'));

  test('project ensure is idempotent by name', () => {
    const a = repos.projects.ensure('copper');
    const b = repos.projects.ensure('copper');
    expect(b.id).toBe(a.id);
    expect(repos.projects.get(a.id)?.name).toBe('copper');
  });

  test('dataset create and item upsert round trip with parsed JSON', () => {
    const project = repos.projects.ensure('copper');
    const ds = repos.datasets.create({ project_id: project.id, name: 'tagging-golden', description: 'seed' });
    expect(repos.datasets.getByName(project.id, 'tagging-golden')?.id).toBe(ds.id);
    const id = uuid7();
    expect(repos.datasets.upsertItems(ds.id, [{ id, input: { transcript: 'bench 3x5' }, expected: { exercise: 'bench' }, tags: ['chest'] }])).toBe(1);
    repos.datasets.upsertItems(ds.id, [{ id, input: { transcript: 'bench 3x6' }, expected: { exercise: 'bench' } }]);
    const items = repos.datasets.listItems(ds.id);
    expect(items).toHaveLength(1);
    expect(items[0]?.input).toEqual({ transcript: 'bench 3x6' });
    expect(items[0]?.tags).toBeNull();
    expect(repos.datasets.countItems(ds.id)).toBe(1);
  });

  test('run create and read with metadata', () => {
    const project = repos.projects.ensure('copper');
    const ds = repos.datasets.create({ project_id: project.id, name: 'runs-ds' });
    const run = repos.runs.create({ dataset_id: ds.id, name: 'rules-v1', metadata: { model: 'rules-v1' } });
    expect(repos.runs.get(run.id)?.metadata).toEqual({ model: 'rules-v1' });
    expect(repos.runs.list(ds.id).map((r) => r.id)).toEqual([run.id]);
    expect(repos.runs.end(run.id)?.ended_at).not.toBeNull();
  });

  test('trace insert ignores duplicates and parses JSON columns', () => {
    const project = repos.projects.ensure('copper');
    const id = uuid7();
    const trace = { id, project_id: project.id, input: 'hi', output: { text: 'yo' }, start: '2026-09-13T00:00:00.000Z', metrics: { duration_ms: 12 } };
    expect(repos.traces.insert(trace)).toBe(true);
    expect(repos.traces.insert(trace)).toBe(false);
    const got = repos.traces.get(id);
    expect(got?.output).toEqual({ text: 'yo' });
    expect(got?.metrics?.duration_ms).toBe(12);
    expect(repos.traces.list({ where: 'project_id = ?', params: [project.id], limit: 10 }).map((t) => t.id)).toContain(id);
    const patched = repos.traces.setMetadata(id, { k: 1 }, [{ at: '2026-09-13T00:00:01.000Z', name: 'transfer' }]);
    expect(patched?.metadata).toEqual({ k: 1 });
    expect(patched?.events?.[0]?.name).toBe('transfer');
  });

  test('score replace keeps one row per (trace, name, source, turn)', () => {
    const project = repos.projects.ensure('copper');
    const id = uuid7();
    repos.traces.insert({ id, project_id: project.id, start: '2026-09-13T00:00:00.000Z' });
    repos.scores.insertMany(id, [{ name: 'match', value: 1, source: 'sdk' }]);
    repos.scores.replace(id, [{ name: 'match', value: 0, source: 'human', label: 'fail', reason: 'wrong' }]);
    repos.scores.replace(id, [{ name: 'match', value: 1, source: 'human', label: 'pass' }]);
    const scores = repos.scores.listByTrace(id);
    expect(scores).toHaveLength(2);
    expect(scores.find((s) => s.source === 'human')?.value).toBe(1);
  });

  test('judge versions, activation, and calibration round trip', () => {
    const judge = repos.judges.ensure('exercise_match', 'checks the exercise');
    const v1 = repos.judges.createVersion({ judge_name: judge.name, number: 1, prompt: 'p', model: 'm', content_hash: 'h1', created_by: 'human' });
    expect(repos.judges.activate(judge.name, v1.id)?.active_version_id).toBe(v1.id);
    expect(repos.judges.calibratedVersionIds(0.9).has(v1.id)).toBe(false);
    repos.judges.putCalibration({ judge_version_id: v1.id, dataset_id: null, split: 'test', n: 40, tpr: 0.94, tnr: 0.88 });
    expect(repos.judges.calibratedVersionIds(0.9).has(v1.id)).toBe(false);
    repos.judges.putCalibration({ judge_version_id: v1.id, dataset_id: null, split: 'test', n: 40, tpr: 0.94, tnr: 0.91 });
    expect(repos.judges.calibratedVersionIds(0.9).has(v1.id)).toBe(true);
    expect(repos.judges.versions(judge.name)).toHaveLength(1);
    expect(repos.judges.calibrations(v1.id)[0]?.tpr).toBe(0.94);
  });
});
