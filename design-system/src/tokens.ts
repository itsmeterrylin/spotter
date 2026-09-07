/**
 * Spotter design tokens. One file. Everything the CSS knows comes from here.
 *
 * Colors: 10 roles. Tints are derived in CSS with color-mix, never stored.
 * Type: 4 sizes, 3 weights, one family. Mono only for raw JSON and ids.
 * Space: 4 steps. Radius: one, plus pill. No shadows.
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
  size: { caption: 16, body: 18, title: 28, stat: 64 },
  lineHeight: { caption: 1.5, body: 1.6, title: 1.3, stat: 1 },
  weight: { regular: 400, semibold: 600, heavy: 800 },
} as const;

export type SizeToken = keyof typeof font.size;

export const space = [8, 16, 32, 64] as const;

export const radius = { default: 16, pill: 999 } as const;

export const duration = '150ms';

export const iconSize = { sm: 20, md: 24, lg: 32 } as const;

/** Density. These make the system airy; components must not go below them. */
export const size = {
  control: 56,
  controlCompact: 48,
  row: 72,
  container: 1200,
  containerNarrow: 720,
} as const;
