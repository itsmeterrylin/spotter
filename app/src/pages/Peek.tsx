import type { Child } from 'hono/jsx';
import type { IconName } from '../../../design-system/src/icons.ts';
import { shownRow, type VersionView } from '../services/judges.ts';
import { urls } from '../urls.ts';
import { when } from './Runs.tsx';
import { Rates } from './judgeParts.tsx';
import { type PanelData, type PeekRef, peekId, peekPath } from './panelData.ts';
import { Panel } from './panels.tsx';
import { NewIssueForm, Turns } from './Trace.tsx';
import { Delta, Icon, JsonView, pct, short, Values } from './ui.tsx';

/** The right-hand region a list opens a peek into. Hidden until a row opens one. */
export const PeekRegion = ({ children }: { children?: Child }) => (
  <aside class="aside pane" id="pane" aria-label="Peek" hidden={!children}>{children}</aside>
);

/** Attributes that make a `.list-row` open a peek. `selected` is the `?peek=` value, if any. */
export const peekRow = (ref: PeekRef, selected: string | undefined) => ({
  'data-peek': peekPath(ref),
  'data-peek-id': peekId(ref),
  'data-peeked': selected !== undefined && selected === peekId(ref) ? '1' : undefined,
});

const kindIcon: Record<PanelData['kind'], IconName> = {
  issue: 'issue',
  trace: 'trace',
  judge: 'judge',
  version: 'backtest',
  run: 'run',
  dataset: 'dataset',
  item: 'dataset',
};

const head = (data: PanelData): { label: string; open: string } => {
  switch (data.kind) {
    case 'issue': return { label: data.issue.title, open: urls.issue(data.issue.id) };
    case 'trace': return { label: short(data.trace.id), open: urls.trace(data.trace.id) };
    case 'judge': return { label: data.judge.name, open: data.judge.url };
    case 'version': return { label: `${data.judge.name} v${data.version.number}`, open: data.version.url };
    case 'run': return { label: data.card.run.name, open: urls.run(data.card.run.id) };
    case 'dataset': return { label: data.dataset.name, open: urls.dataset(data.dataset.id) };
    case 'item': return { label: short(data.item.id), open: urls.dataset(data.dataset.id) };
  }
};

const Block = ({ label, icon, children }: { label: string; icon: IconName; children: Child }) => (
  <div class="block">
    <span class="block-label"><Icon name={icon} size="sm" />{label}</span>
    {children}
  </div>
);

const excerpt = (s: string, n = 360): string => (s.length > n ? `${s.slice(0, n - 3)}...` : s);

const VersionPreview = ({ version }: { version: VersionView | undefined }) => {
  if (!version) return <p class="muted">No versions yet</p>;
  const row = shownRow(version.calibration);
  return (
    <>
      <Block label="Criterion" icon="judge"><p class="transcript mono prompt">{excerpt(version.prompt)}</p></Block>
      <Block label="Calibration" icon="score">{row ? <Rates row={row} /> : <p class="muted">Needs labels</p>}</Block>
    </>
  );
};

const Preview = ({ data }: { data: PanelData }) => {
  switch (data.kind) {
    case 'issue': {
      const first = [...data.issue.occurrence_list].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
      return (
        <>
          <Block label="Description" icon="menu">{data.issue.description ? <p class="note">{data.issue.description}</p> : <p class="muted">No description</p>}</Block>
          <Block label="First occurrence" icon="trace">
            {first ? (
              <div class="list-row">
                <a class="id mono" href={first.url}>{short(first.trace_id)}</a>
                <span class="meta">{first.turn === null ? 'whole trace' : `turn ${first.turn}`}</span>
                <span class="grow muted">{first.evidence ?? ''}</span>
              </div>
            ) : <p class="muted">No occurrences</p>}
          </Block>
        </>
      );
    }
    case 'trace': {
      const { trace } = data;
      return (
        <div class="review">
          <NewIssueForm trace={trace} />
          <Block label={trace.messages?.length ? 'Conversation' : 'Input'} icon="trace">
            {trace.messages?.length ? <Turns messages={trace.messages} scores={trace.scores} flags /> : <JsonView value={trace.input} />}
          </Block>
          {trace.messages?.length || trace.output === null ? null : <Block label="Output" icon="score"><Values value={trace.output} /></Block>}
        </div>
      );
    }
    case 'judge': return <VersionPreview version={data.judge.versions.find((v) => v.active) ?? data.judge.versions[data.judge.versions.length - 1]} />;
    case 'version': return <VersionPreview version={data.version} />;
    case 'run': {
      const entries = Object.entries(data.card.scores);
      return (
        <Block label="Scores" icon="score">
          {entries.length ? (
            <div>
              {entries.map(([name, s]) => (
                <div class="list-row">
                  <span class="grow strong">{name}</span>
                  <span class="num strong">{pct(s.mean)}</span>
                  <Delta value={s.diff} />
                  <span class="meta num" title="Scored traces">{`n=${s.n}`}</span>
                </div>
              ))}
            </div>
          ) : <p class="muted">No scores yet</p>}
        </Block>
      );
    }
    case 'dataset':
      return (
        <Block label="Latest runs" icon="run">
          {data.cards.length ? (
            <div>
              {data.cards.slice(0, 3).map(({ run, primary, scores }) => {
                const s = primary ? scores[primary] : undefined;
                return (
                  <div class="list-row">
                    <a class="grow strong" href={urls.run(run.id)}>{run.name}</a>
                    {s ? <span class="num strong">{pct(s.mean)}</span> : null}
                    <span class="meta num" title={run.started_at}>{when(run.started_at)}</span>
                  </div>
                );
              })}
            </div>
          ) : <p class="muted">No runs yet</p>}
        </Block>
      );
    case 'item':
      return (
        <>
          <Block label="Input" icon="trace"><JsonView value={data.item.input} /></Block>
          <Block label="Expected" icon="flag"><JsonView value={data.item.expected} /></Block>
        </>
      );
  }
};

type Props = { data: PanelData; closeHref: string };

/** One peek: a one-line header, the object's right panel, then a short preview. */
export const PeekPane = ({ data, closeHref }: Props) => {
  const { label, open } = head(data);
  return (
    <div class="pane-inner" data-peek-kind={data.kind}>
      <div class="pane-head">
        <div class="pane-id">
          <Icon name={kindIcon[data.kind]} />
          <span class="pane-title" title={label}>{label}</span>
        </div>
        <div class="pane-actions">
          {data.kind === 'trace' ? (
            <button class="btn btn-ghost btn-icon" type="button" data-new-issue-open title="New issue" aria-label="New issue"><Icon name="issue" size="sm" /></button>
          ) : null}
          <a class="btn btn-secondary" href={open} title="Open the full page"><Icon name="open" size="sm" />Open</a>
          <a class="btn btn-ghost btn-icon" href={closeHref} data-pane-close title="Close" aria-label="Close"><Icon name="fail" size="sm" /></a>
        </div>
      </div>
      <Panel data={data} />
      <div class="pane-preview"><Preview data={data} /></div>
    </div>
  );
};
