/**
 * Typography tokens.
 *
 * Rules:
 * - Four sizes, one per job. Smallest is 16px. There is no 12px or 14px step.
 * - Every step is at least 1.5x except caption to body, which weight separates.
 * - Three weights: 400, 600, 800.
 * - Numbers use tabular figures so columns line up.
 * - Mono is for raw JSON and ids only. Outputs, names, and numbers use the body face.
 */

export const fontSize = {
  /** Labels, table headers, meta lines. The floor. */
  caption: 16,
  /** Everything else: cells, transcripts, notes. */
  body: 18,
  /** Card titles and section heads. The page heading is this size at 800. */
  title: 28,
  /** Numbers on tiles and the empty-state headline. */
  stat: 64,
} as const;

export type FontSizeToken = keyof typeof fontSize;

export const lineHeight = {
  caption: 1.5,
  body: 1.6,
  title: 1.3,
  stat: 1,
} as const satisfies Record<FontSizeToken, number>;

export const letterSpacing = {
  caption: '0.01em',
  body: '0',
  title: '-0.01em',
  stat: '-0.03em',
} as const satisfies Record<FontSizeToken, string>;

export const fontWeight = {
  regular: 400,
  semibold: 600,
  heavy: 800,
} as const;

/**
 * One text style per size token. Modifiers, not styles:
 * `.strong` (600), `.heavy` (800, the page heading), `.mono`, `.num`.
 */
export const textStyle = {
  caption: { size: 'caption', weight: 'semibold', family: 'body' },
  body: { size: 'body', weight: 'regular', family: 'body' },
  title: { size: 'title', weight: 'semibold', family: 'heading' },
  stat: { size: 'stat', weight: 'heavy', family: 'heading' },
} as const satisfies Record<
  string,
  { size: FontSizeToken; weight: keyof typeof fontWeight; family: FontFamilyRole }
>;

export type TextStyleToken = keyof typeof textStyle;
export type FontFamilyRole = 'heading' | 'body' | 'mono';

export type FontPair = {
  id: string;
  label: string;
  heading: string;
  body: string;
  mono: string;
  /** Google Fonts stylesheet, or null when self-hosted. */
  googleFontsUrl: string | null;
  /** Optional @font-face declarations for self-hosted faces. */
  fontFace?: string;
};

const sansFallback = `system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
const monoFallback = `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;

/**
 * The type family. One family for headings and body; hierarchy comes
 * from size and weight. Mono is the system monospace stack because it
 * appears only on raw JSON and ids, which does not justify a download.
 *
 * Candidates compared before this choice are listed in
 * docs/design/font-pairs.md. Add an entry here to compare another.
 */
export const fontPairs: readonly FontPair[] = [
  {
    id: 'open',
    label: 'Open Sans',
    heading: `"Open Sans", ${sansFallback}`,
    body: `"Open Sans", ${sansFallback}`,
    mono: monoFallback,
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700;800&display=swap',
  },
] as const;

export const defaultFontPairId = 'open';

export const fontFeatures = {
  /** Tabular, lining numerals for any number that sits in a column. */
  numeric: `"tnum" 1, "lnum" 1`,
  default: `"kern" 1, "liga" 1`,
} as const;
