# Copper Evaluations design system

Tokens and component contracts in TypeScript. CSS is generated, never hand-edited.

## Use

```bash
cd design-system
npm run build   # dist/tokens.css, dist/system.css, dist/tokens.json, preview/index.html
npm run check   # type-check
open preview/index.html
```

`preview/index.html` is self-contained. It has a font pair switcher and a theme switcher.

## Rules

| Rule | Value |
|---|---|
| Smallest text | 16px |
| Type steps | 16, 18, 22, 28, 36, 44, 56, 72, 96 |
| Control height | 56px (48px inside table rows) |
| Table row | 72px |
| Card padding | 32px |
| Section gap | 64px |
| Primary actions per screen | 1 |
| Accent | Copper `#C25A44`. Pass, fail, and defer colors are semantic, not accents. |

## Files

| File | Holds |
|---|---|
| `src/tokens/color.ts` | Palette and light and dark semantic roles |
| `src/tokens/typography.ts` | Scale, weights, text styles, font pairs |
| `src/tokens/layout.ts` | Space, radius, shadow, motion, icon sizes, density rules |
| `src/icons.ts` | Inline SVG icon set, named by meaning |
| `src/components.ts` | Prop types and class mappers for every component |
| `src/css.ts` | Token, base, and component CSS generators |
| `src/build.ts` | Writes `dist/` and the preview page |

## Font pairs

| Id | Heading | Body |
|---|---|---|
| `sora` | Sora | Manrope |
| `rubik` | Rubik | Lexend |
| `open` | Open Sans | Open Sans |
| `sf` | San Francisco | San Francisco |
| `jakarta` | Plus Jakarta Sans | Figtree |
| `outfit` | Outfit | Source Sans 3 |
| `grotesk` | Space Grotesk | IBM Plex Sans |
| `dm` | DM Sans | DM Sans |
