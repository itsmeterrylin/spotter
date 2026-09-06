/**
 * Typography tokens.
 *
 * Rules:
 * - Smallest text on screen is 16px. There is no 12px or 14px step.
 * - Each step is visibly larger than the last (ratio 1.22 to 1.29).
 * - Numbers use tabular figures so columns line up.
 */

export const fontSize = {
  /** Labels, captions, table meta. The floor. */
  caption: 16,
  /** Default body text. */
  body: 18,
  /** Intro lines, table cells that carry the main content. */
  lead: 22,
  /** Card titles, table headers. */
  title: 28,
  /** Section headings. */
  heading: 36,
  /** Page headings. */
  display: 44,
  /** Hero headings on empty states and marketing surfaces. */
  hero: 56,
  /** Big numbers on stat tiles. */
  stat: 72,
  /** One number that owns the screen. */
  giant: 96,
} as const;

export type FontSizeToken = keyof typeof fontSize;

export const lineHeight = {
  caption: 1.5,
  body: 1.6,
  lead: 1.5,
  title: 1.3,
  heading: 1.2,
  display: 1.1,
  hero: 1.05,
  stat: 1,
  giant: 1,
} as const satisfies Record<FontSizeToken, number>;

export const letterSpacing = {
  caption: '0.01em',
  body: '0',
  lead: '0',
  title: '-0.01em',
  heading: '-0.015em',
  display: '-0.02em',
  hero: '-0.025em',
  stat: '-0.03em',
  giant: '-0.035em',
} as const satisfies Record<FontSizeToken, string>;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/** Text styles combine size, weight, and family role. */
export const textStyle = {
  caption: { size: 'caption', weight: 'medium', family: 'body' },
  body: { size: 'body', weight: 'regular', family: 'body' },
  bodyStrong: { size: 'body', weight: 'semibold', family: 'body' },
  lead: { size: 'lead', weight: 'regular', family: 'body' },
  title: { size: 'title', weight: 'semibold', family: 'heading' },
  heading: { size: 'heading', weight: 'bold', family: 'heading' },
  display: { size: 'display', weight: 'bold', family: 'heading' },
  hero: { size: 'hero', weight: 'bold', family: 'heading' },
  stat: { size: 'stat', weight: 'bold', family: 'heading' },
  giant: { size: 'giant', weight: 'bold', family: 'heading' },
  code: { size: 'caption', weight: 'regular', family: 'mono' },
  codeBlock: { size: 'body', weight: 'regular', family: 'mono' },
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
  /** Headings in this pair look best at this weight. */
  headingWeight: keyof typeof fontWeight;
};

const sansFallback = `system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
const monoFallback = `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;

/**
 * Candidate font pairs. Pick one; the others stay for comparison.
 * San Francisco is the Apple system face. It has no web download, so the
 * stack resolves to SF on Apple devices and to the platform sans elsewhere.
 */
export const fontPairs: readonly FontPair[] = [
  {
    id: 'sora',
    label: 'Sora + Manrope',
    heading: `Sora, ${sansFallback}`,
    body: `Manrope, ${sansFallback}`,
    mono: `"JetBrains Mono", ${monoFallback}`,
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
    headingWeight: 'bold',
  },
  {
    id: 'rubik',
    label: 'Rubik + Lexend',
    heading: `Rubik, ${sansFallback}`,
    body: `Lexend, ${sansFallback}`,
    mono: `"JetBrains Mono", ${monoFallback}`,
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Rubik:wght@500;600;700&family=Lexend:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
    headingWeight: 'bold',
  },
  {
    id: 'open',
    label: 'Open Sans',
    heading: `"Open Sans", ${sansFallback}`,
    body: `"Open Sans", ${sansFallback}`,
    mono: `"JetBrains Mono", ${monoFallback}`,
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap',
    headingWeight: 'bold',
  },
  {
    id: 'sf',
    label: 'San Francisco',
    heading: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, "Segoe UI", Roboto, sans-serif`,
    body: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, "Segoe UI", Roboto, sans-serif`,
    mono: `ui-monospace, "SF Mono", Menlo, Consolas, monospace`,
    googleFontsUrl: null,
    headingWeight: 'bold',
  },
  {
    id: 'jakarta',
    label: 'Plus Jakarta Sans + Figtree',
    heading: `"Plus Jakarta Sans", ${sansFallback}`,
    body: `Figtree, ${sansFallback}`,
    mono: `"JetBrains Mono", ${monoFallback}`,
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Figtree:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
    headingWeight: 'bold',
  },
  {
    id: 'outfit',
    label: 'Outfit + Source Sans 3',
    heading: `Outfit, ${sansFallback}`,
    body: `"Source Sans 3", ${sansFallback}`,
    mono: `"Source Code Pro", ${monoFallback}`,
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Source+Sans+3:wght@400;500;600&family=Source+Code+Pro:wght@400;500&display=swap',
    headingWeight: 'bold',
  },
  {
    id: 'grotesk',
    label: 'Space Grotesk + IBM Plex Sans',
    heading: `"Space Grotesk", ${sansFallback}`,
    body: `"IBM Plex Sans", ${sansFallback}`,
    mono: `"IBM Plex Mono", ${monoFallback}`,
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap',
    headingWeight: 'bold',
  },
  {
    id: 'dm',
    label: 'DM Sans + DM Mono',
    heading: `"DM Sans", ${sansFallback}`,
    body: `"DM Sans", ${sansFallback}`,
    mono: `"DM Mono", ${monoFallback}`,
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap',
    headingWeight: 'bold',
  },
] as const;

export const defaultFontPairId = 'sora';

export const fontFeatures = {
  /** Tabular, lining numerals for any number that sits in a column. */
  numeric: `"tnum" 1, "lnum" 1`,
  default: `"kern" 1, "liga" 1`,
} as const;
