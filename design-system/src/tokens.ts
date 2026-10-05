/**
 * Spotter design tokens. One file. Everything the CSS knows comes from here.
 *
 * Colors: 10 roles. Tints are derived in CSS with color-mix, never stored.
 * Type: 4 sizes, 3 weights, one family. Mono only for raw JSON and ids.
 * Space: 8 steps. Radius: one, plus pill. No shadows.
 */

export type Colors = {
  canvas: string;
  surface: string;
  border: string;
  ink: string;
  inkMuted: string;
  brand: string;
  pass: string;
  fail: string;
  defer: string;
  focus: string;
};

/** Brand anchor: copper #C25A44 from the Copper iOS app. */
export const color: { light: Colors; dark: Colors } = {
  light: {
    canvas: '#FBF8F3',
    surface: '#FFFFFF',
    border: '#E7E0D6',
    ink: '#1A1613',
    inkMuted: '#6F675F',
    brand: '#C25A44',
    pass: '#167A4E',
    fail: '#C23B33',
    defer: '#9A6300',
    focus: '#E8927A',
  },
  dark: {
    canvas: '#141210',
    surface: '#1E1B18',
    border: '#302B26',
    ink: '#F5F1EB',
    inkMuted: '#A29A8F',
    brand: '#E8927A',
    pass: '#4FCB8B',
    fail: '#F07067',
    defer: '#F2B84B',
    focus: '#E8927A',
  },
};

export const font = {
  family: `"Open Sans", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
  mono: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`,
  googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;800&display=swap',
  /** caption: labels and meta. body: everything else. title: headings. stat: big numbers. */
  size: { caption: 13, body: 15, title: 22, stat: 44 },
  lineHeight: { caption: 1.45, body: 1.5, title: 1.25, stat: 1 },
  weight: { regular: 400, semibold: 600, heavy: 800 },
} as const;

export type SizeToken = keyof typeof font.size;

export const space = [4, 8, 12, 16, 24, 32, 48, 64] as const;

export const radius = { default: 10, pill: 999 } as const;

export const duration = '150ms';

export const iconSize = { sm: 16, md: 20, lg: 28 } as const;

/** Density. Slightly dense: sized for data-heavy trace pages. Components must not go below these. */
export const size = {
  control: 40,
  controlCompact: 32,
  row: 44,
  container: 1200,
  containerNarrow: 440,
  /** Shell regions: left rail, section sidebar, right aside, bottom status bar. */
  rail: 56,
  sidebar: 248,
  aside: 300,
  statusbar: 32,
  /** List rows are denser than table rows; text stays at the caption size (13) or above. */
  rowList: 40,
} as const;
