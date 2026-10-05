/**
 * Spotter design tokens. One file. Everything the CSS knows comes from here.
 * Neutrals, type, sizes, radii, and shadows match Linear's measured values
 * (docs/design/linear-reference.md). Brand, pass, fail, and defer stay Spotter's.
 *
 * Colors: 16 roles. Tints are derived in CSS with color-mix, never stored.
 * Type: Open Sans variable, 6 sizes (12, 13, 15, 18, 24, 32), weights 400 to 600.
 * Space: 4 to 64 plus 6 and 10. Radius: 8 control, 12 panel and menu, pill.
 * Shadows: two, panel and popover. Nothing else casts a shadow.
 */

export type Colors = {
  canvas: string;
  surface: string;
  raised: string;
  fill: string;
  fillStrong: string;
  border: string;
  borderSubtle: string;
  ink: string;
  inkSecondary: string;
  inkMuted: string;
  inkFaint: string;
  brand: string;
  pass: string;
  fail: string;
  defer: string;
  focus: string;
};

/** Brand anchor: copper #C25A44 from the Copper iOS app. */
export const color: { light: Colors; dark: Colors } = {
  light: {
    canvas: '#EFEFF0',
    surface: '#F9F9FA',
    raised: '#FFFFFF',
    fill: '#E9E9EA',
    fillStrong: '#E5E5E6',
    border: '#DEDEDE',
    borderSubtle: '#F1F1F1',
    ink: '#1B1B1B',
    inkSecondary: '#2F2F31',
    inkMuted: '#5C5C5E',
    inkFaint: '#9C9D9F',
    brand: '#C25A44',
    pass: '#167A4E',
    fail: '#C23B33',
    defer: '#9A6300',
    focus: '#C25A44',
  },
  dark: {
    canvas: '#09090A',
    surface: '#121213',
    raised: '#1A1A1B',
    fill: '#161617',
    fillStrong: '#17181A',
    border: '#232426',
    borderSubtle: '#1A1B1D',
    ink: '#FFFFFF',
    inkSecondary: '#E3E4E6',
    inkMuted: '#959597',
    inkFaint: '#565759',
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
  googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300..800&display=swap',
  /** meta: dates, tabs, buttons, chips. ui: rows, nav, properties. content: long text. heading: dialogs and sections. title: page titles. stat: stat cards. */
  size: { meta: 12, ui: 13, content: 15, heading: 18, title: 24, stat: 32 },
  lineHeight: { meta: 1.25, ui: 1.25, content: 1.6, heading: 1.5, title: 1.6, stat: 1.2 },
  weight: { regular: 400, book: 450, medium: 500, semibold: 550, bold: 600 },
} as const;

export type SizeToken = keyof typeof font.size;

export const space = [4, 6, 8, 10, 12, 16, 24, 32, 48, 64] as const;

export const radius = { control: 8, panel: 12, menu: 12, switcher: 10, pill: 9999 } as const;

export const shadow = {
  panel: '0 3px 6px -2px rgb(0 0 0 / 2%), 0 1px 1px rgb(0 0 0 / 4%)',
  popover: '0 6px 18px rgb(0 0 0 / 2%), 0 3px 9px rgb(0 0 0 / 4%), 0 1px 1px rgb(0 0 0 / 4%)',
} as const;

export const duration = '150ms';

/** Rendered icon sizes. Stroke stays 2 on the 24 grid, about 1.3px at 16. */
export const iconSize = { sm: 14, md: 16, lg: 20 } as const;

/** Density, from Linear's measured sizes. Components must not go below these. */
export const size = {
  control: 28,
  chip: 24,
  menuItem: 32,
  groupHeader: 36,
  row: 44,
  container: 1200,
  containerNarrow: 440,
  /** Widest a detail page body gets, left-aligned under the title. */
  detail: 760,
  /** Shell regions: left rail, section sidebar, right aside and peek panel, bottom status bar. */
  rail: 48,
  sidebar: 244,
  aside: 386,
  statusbar: 28,
  /** Header bar at the top of the main panel. */
  header: 44,
} as const;
