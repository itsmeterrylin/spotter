/**
 * Color tokens.
 *
 * Two layers:
 * 1. `palette`  raw scales. Never used directly in UI code.
 * 2. `light` / `dark`  semantic roles. UI code uses only these.
 *
 * Brand anchors come from the Copper iOS app: copper `#C25A44`,
 * cream `#FFF6E5`, sand `#F5D398`.
 */

export const palette = {
  copper: {
    50: '#FDF1EC',
    100: '#F9DCD1',
    200: '#F2B9A6',
    300: '#E8927A',
    400: '#D97052',
    500: '#C25A44',
    600: '#A8472F',
    700: '#8A3824',
    800: '#6B2B1B',
    900: '#4A1D12',
  },
  sand: {
    50: '#FFFBF3',
    100: '#FFF6E5',
    200: '#F5D398',
    300: '#E9BC6E',
    400: '#D4A24A',
  },
  warmGray: {
    0: '#FFFFFF',
    50: '#FBF8F3',
    100: '#F3EEE6',
    200: '#E7E0D6',
    300: '#CFC5B7',
    400: '#A29A8F',
    500: '#6F675F',
    600: '#4A433C',
    700: '#302B26',
    800: '#1E1B18',
    900: '#1A1613',
    950: '#141210',
  },
  green: {
    100: '#DDF5E8',
    300: '#7FD6A8',
    500: '#1E8E5A',
    700: '#146A42',
  },
  red: {
    100: '#FDE3E1',
    300: '#F4A19B',
    500: '#D6453D',
    700: '#A83229',
  },
  amber: {
    100: '#FFF1D6',
    300: '#F2B84B',
    500: '#B57400',
    700: '#8A5800',
  },
  blue: {
    100: '#E3ECFB',
    300: '#8FB2EC',
    500: '#2F6FD6',
    700: '#1F4F9E',
  },
} as const;

export type SemanticColors = {
  /** Page background. Warm, not pure white. */
  canvas: string;
  /** Cards and panels. */
  surface: string;
  /** Inset areas: table headers, code, sunken wells. */
  surfaceSunken: string;
  /** Hover state for surfaces. */
  surfaceHover: string;
  border: string;
  borderStrong: string;
  /** Primary text. */
  ink: string;
  /** Secondary text. Still 4.5:1 on surface. */
  ink2: string;
  /** Tertiary text and icons. Minimum contrast text color. */
  ink3: string;
  inkInverse: string;
  brand: string;
  brandHover: string;
  brandSoft: string;
  brandInk: string;
  accent: string;
  accentSoft: string;
  pass: string;
  passSoft: string;
  passInk: string;
  fail: string;
  failSoft: string;
  failInk: string;
  defer: string;
  deferSoft: string;
  deferInk: string;
  info: string;
  infoSoft: string;
  infoInk: string;
  focusRing: string;
  overlay: string;
};

export const light: SemanticColors = {
  canvas: palette.warmGray[50],
  surface: palette.warmGray[0],
  surfaceSunken: palette.warmGray[100],
  surfaceHover: palette.sand[50],
  border: palette.warmGray[200],
  borderStrong: palette.warmGray[300],
  ink: palette.warmGray[900],
  ink2: palette.warmGray[600],
  ink3: palette.warmGray[500],
  inkInverse: palette.warmGray[0],
  brand: palette.copper[500],
  brandHover: palette.copper[600],
  brandSoft: palette.copper[50],
  brandInk: palette.copper[700],
  accent: palette.sand[200],
  accentSoft: palette.sand[100],
  pass: palette.green[500],
  passSoft: palette.green[100],
  passInk: palette.green[700],
  fail: palette.red[500],
  failSoft: palette.red[100],
  failInk: palette.red[700],
  defer: palette.amber[500],
  deferSoft: palette.amber[100],
  deferInk: palette.amber[700],
  info: palette.blue[500],
  infoSoft: palette.blue[100],
  infoInk: palette.blue[700],
  focusRing: palette.copper[300],
  overlay: 'rgba(26, 22, 19, 0.5)',
};

export const dark: SemanticColors = {
  canvas: palette.warmGray[950],
  surface: palette.warmGray[800],
  surfaceSunken: palette.warmGray[900],
  surfaceHover: palette.warmGray[700],
  border: palette.warmGray[700],
  borderStrong: palette.warmGray[600],
  ink: '#F5F1EB',
  ink2: '#CFC7BD',
  ink3: palette.warmGray[400],
  inkInverse: palette.warmGray[900],
  brand: palette.copper[300],
  brandHover: palette.copper[200],
  brandSoft: 'rgba(194, 90, 68, 0.18)',
  brandInk: palette.copper[200],
  accent: palette.sand[300],
  accentSoft: 'rgba(245, 211, 152, 0.14)',
  pass: '#4FCB8B',
  passSoft: 'rgba(30, 142, 90, 0.22)',
  passInk: palette.green[300],
  fail: '#F07067',
  failSoft: 'rgba(214, 69, 61, 0.22)',
  failInk: palette.red[300],
  defer: palette.amber[300],
  deferSoft: 'rgba(181, 116, 0, 0.22)',
  deferInk: palette.amber[300],
  info: palette.blue[300],
  infoSoft: 'rgba(47, 111, 214, 0.22)',
  infoInk: palette.blue[300],
  focusRing: palette.copper[300],
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const themes = { light, dark } as const;
export type ThemeName = keyof typeof themes;
