/**
 * Space, radius, shadow, motion, size, and breakpoint tokens.
 *
 * The scale is 8px based. 4px exists for hairline gaps only.
 * Component rules at the bottom enforce the airy density.
 */

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
  16: 64,
  24: 96,
  32: 128,
} as const;

export type SpaceToken = keyof typeof space;

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const shadow = {
  none: 'none',
  sm: '0 1px 2px rgba(26, 22, 19, 0.06)',
  md: '0 4px 16px rgba(26, 22, 19, 0.08)',
  lg: '0 12px 40px rgba(26, 22, 19, 0.12)',
  focus: '0 0 0 4px var(--color-focus-ring)',
} as const;

export const motion = {
  duration: {
    fast: '150ms',
    base: '250ms',
    slow: '400ms',
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    enter: 'cubic-bezier(0, 0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const;

export const iconSize = {
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
} as const;

export const iconStroke = 2;

export const breakpoint = {
  sm: 640,
  md: 900,
  lg: 1200,
  xl: 1440,
} as const;

export const container = {
  /** Reading width for docs and review screens. */
  narrow: 720,
  /** Default app width. */
  default: 1200,
  /** Compare tables. */
  wide: 1440,
} as const;

/**
 * Density rules. These are the difference between this system and a
 * dense engineering dashboard. Components must not go below them.
 */
export const density = {
  /** Minimum hit area for any control. */
  touchTarget: 48,
  /** Default control height (buttons, inputs, selects). */
  controlHeight: 56,
  /** Compact control height, used only inside table rows. */
  controlHeightCompact: 48,
  /** Table row height. */
  tableRow: 72,
  /** Card padding. */
  cardPadding: space[8],
  /** Gap between cards in a grid. */
  cardGap: space[6],
  /** Gap between page sections. */
  sectionGap: space[16],
  /** Page gutter at md and above. */
  pageGutter: space[12],
  /** Page gutter below md. */
  pageGutterSm: space[6],
  /** Maximum number of primary actions visible on one screen. */
  maxPrimaryActions: 1,
  /** Maximum stat tiles in one row. */
  maxStatsPerRow: 4,
} as const;
