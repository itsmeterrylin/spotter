/**
 * Component contracts. Framework-agnostic prop types plus the CSS class
 * each variant maps to. A React, Svelte, or plain-DOM implementation
 * must satisfy these types and use these classes.
 */

import type { IconName } from './icons.ts';

export type Verdict = 'pass' | 'fail' | 'defer' | 'pending';

export type ButtonProps = {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'pass' | 'fail' | 'defer';
  size?: 'default' | 'compact';
  icon?: IconName;
  iconOnly?: boolean;
  disabled?: boolean;
  /** Keyboard shortcut shown beside the label, e.g. "1". */
  shortcut?: string;
};
export const buttonClass = (p: ButtonProps): string =>
  ['btn', `btn-${p.variant ?? 'secondary'}`, p.size === 'compact' && 'btn-compact', p.iconOnly && 'btn-icon']
    .filter(Boolean)
    .join(' ');

export type CardProps = {
  variant?: 'flat' | 'raised' | 'brand' | 'accent';
};
export const cardClass = (p: CardProps): string =>
  ['card', p.variant && p.variant !== 'flat' && `card-${p.variant}`].filter(Boolean).join(' ');

export type VerdictPillProps = {
  verdict: Verdict;
  size?: 'default' | 'lg';
  /** Shown after the icon. Defaults to the verdict word. */
  label?: string;
};
export const verdictIcon: Record<Verdict, IconName> = {
  pass: 'pass',
  fail: 'fail',
  defer: 'defer',
  pending: 'time',
};
export const verdictClass = (p: VerdictPillProps): string =>
  ['verdict', `verdict-${p.verdict}`, p.size === 'lg' && 'verdict-lg'].filter(Boolean).join(' ');

export type StatTileProps = {
  label: string;
  icon?: IconName;
  /** Preformatted. The tile does not format numbers. */
  value: string;
  delta?: { value: string; direction: 'up' | 'down' | 'flat' };
};

export type ScoreBarProps = {
  /** 0 to 1. */
  value: number;
  tone?: 'brand' | 'pass' | 'fail';
};

export type CompareCell = {
  output: string;
  scores: Record<string, number>;
  verdict?: Verdict;
  latencyMs?: number;
  cost?: number;
};

export type CompareRow = {
  itemId: string;
  input: string;
  expected?: string;
  cells: Record<string, CompareCell>;
};

export type CompareTableProps = {
  baselineRunId: string;
  candidateRunIds: string[];
  scoreNames: string[];
  rows: CompareRow[];
  /** Hide rows where every run agrees. */
  onlyChanges?: boolean;
};

export type ReviewCardProps = {
  traceId: string;
  position: number;
  total: number;
  input: string;
  output: string;
  expected?: string;
  verdict: Verdict;
  note?: string;
  /** Failure tags appear only after error analysis produced them. */
  failureTags?: string[];
};

/** Keyboard map for the review screen. Displayed with the `kbd` class. */
export const reviewShortcuts = {
  pass: '1',
  fail: '2',
  defer: 'D',
  undo: 'U',
  previous: '←',
  next: '→',
  save: '⌘S',
  saveAndNext: '⌘↵',
} as const;

export type NavItem = {
  label: string;
  icon: IconName;
  href: string;
  current?: boolean;
};

export type TabsProps = {
  tabs: { id: string; label: string; count?: number }[];
  selected: string;
};

export type TextFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
};

export type ToggleProps = {
  label: string;
  checked: boolean;
};

export type SegmentedProps = {
  options: { id: string; label: string }[];
  selected: string;
};

export type EmptyStateProps = {
  icon: IconName;
  title: string;
  action?: ButtonProps;
};

export type ToastProps = {
  message: string;
  tone?: 'default' | 'pass' | 'fail';
};
