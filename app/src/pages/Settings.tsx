import { config } from '../config.ts';
import type { AttributeMapView } from '../services/attributeMap.ts';
import { urls } from '../urls.ts';
import { Layout } from './Layout.tsx';
import { Icon } from './ui.tsx';
import pkg from '../../package.json' with { type: 'json' };

type Props = { maps: AttributeMapView[]; authSet: boolean; unread: number };

const Code = ({ text }: { text: string }) => <pre class="code">{text}</pre>;

const mcpAdd = `claude mcp add --transport http spotter ${config.baseUrl}/mcp`;

const otlpEnv = `OTEL_EXPORTER_OTLP_ENDPOINT=${config.baseUrl}/api/otel
OTEL_EXPORTER_OTLP_PROTOCOL=http/json
OTEL_RESOURCE_ATTRIBUTES=spotter.project=default`;

const restExample = `curl -X POST ${config.baseUrl}/api/traces/batch \\
  -H 'content-type: application/json' \\
  -d '{"traces":[{"project":"default","input":{"transcript":"..."},"output":{"exercise":"Squat"},
       "start":"2026-09-14T00:00:00Z","scores":[{"name":"exercise_match","value":1,"source":"sdk"}]}]}'`;

const tools: Array<[string, string]> = [
  ['list', 'datasets · items · runs · traces · notes · judges · disagreements'],
  ['read', 'run · trace · dataset · judge · audit · attribute_map'],
  ['write', 'dataset.create · items.upsert · run.create · traces.insert · trace.patch_metadata · scores.put · judge.propose · judge.activate · judge.calibrate · attribute_map.set'],
  ['compare', 'dataset_id · run_ids · only=changes'],
];

const Section = ({ icon, title, children }: { icon: Parameters<typeof Icon>[0]['name']; title: string; children: unknown }) => (
  <section class="settings-section">
    <h2 class="t-title"><Icon name={icon} />{title}</h2>
    <div class="stack">{children}</div>
  </section>
);

export const SettingsPage = ({ maps, authSet, unread }: Props) => (
  <Layout title="Settings" section="settings" unread={unread}>
    <div class="stack settings">
      <Section icon="human" title="Appearance">
        <div class="cluster" style="--gap: var(--space-8)" role="group" aria-label="Theme">
          <button type="button" class="btn btn-secondary btn-compact" data-theme-choice="system" aria-pressed="true">Auto</button>
          <button type="button" class="btn btn-secondary btn-compact" data-theme-choice="light" aria-pressed="false">Light</button>
          <button type="button" class="btn btn-secondary btn-compact" data-theme-choice="dark" aria-pressed="false">Dark</button>
        </div>
      </Section>

      <Section icon="judge" title="Agents">
        <div class="card stack">
          <dl class="kv">
            <dt>MCP endpoint</dt><dd class="mono">{config.baseUrl}/mcp</dd>
            <dt>Auth token</dt><dd><span class={`pill ${authSet ? 'pill-pass' : ''}`}>{authSet ? 'set' : 'not set'}</span></dd>
            <dt>Skill file</dt><dd class="mono">skills/spotter.md</dd>
          </dl>
          <Code text={mcpAdd} />
        </div>
        <div class="card card-flush scroll-x">
          <table class="table">
            <thead><tr><th>Tool</th><th>Accepts</th></tr></thead>
            <tbody>{tools.map(([name, accepts]) => <tr><td class="strong mono">{name}</td><td class="muted">{accepts}</td></tr>)}</tbody>
          </table>
        </div>
      </Section>

      <Section icon="trace" title="Data sources">
        <div class="card stack">
          <span class="t-caption muted">OpenTelemetry (OTLP/HTTP JSON)</span>
          <dl class="kv"><dt>Endpoint</dt><dd class="mono">{config.baseUrl}/api/otel/v1/traces</dd></dl>
          <Code text={otlpEnv} />
          <span class="t-caption muted">Resource or span attributes: spotter.project · spotter.run_id · spotter.dataset_item_id</span>
        </div>
        <div class="card stack">
          <span class="t-caption muted">REST batch</span>
          <Code text={restExample} />
        </div>
        <div class="card stack">
          <span class="t-caption muted">SDK</span>
          <Code text={`spotter init\nspotter run evals/<name>.ts`} />
        </div>
        {maps.map((m) => (
          <div class="card card-flush">
            <div class="row"><Icon name="filter" /><div class="grow"><span class="strong">Attribute map</span> <span class="muted">· {m.project}</span></div><span class="t-caption mono muted">write attribute_map.set</span></div>
            {m.map.length ? (
              <table class="table">
                <thead><tr><th>Source</th><th>Target</th><th>Type</th></tr></thead>
                <tbody>{m.map.map((e) => <tr><td class="mono">{e.source}</td><td class="mono">metadata.{e.target}</td><td class="muted">{e.type}</td></tr>)}</tbody>
              </table>
            ) : <div class="row"><span class="muted">No promoted attributes</span></div>}
          </div>
        ))}
      </Section>

      <Section icon="tokens" title="About">
        <div class="card">
          <dl class="kv">
            <dt>Version</dt><dd>v{pkg.version}</dd>
            <dt>Base URL</dt><dd class="mono">{config.baseUrl}</dd>
            <dt>Database</dt><dd class="mono">{config.db}</dd>
            <dt>Health</dt><dd><a class="link" href={`${config.baseUrl}/health`}>/health</a></dd>
            <dt>Traces</dt><dd><a class="link" href={urls.traces()}>all traces</a></dd>
          </dl>
        </div>
      </Section>
    </div>
  </Layout>
);
