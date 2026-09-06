# Font pairs

Seven candidates, all sans-serif and all on Google Fonts, so they render the same on every platform. Toggle between them in `design-system/preview/index.html`. Screenshots are 1440px wide, light theme. One dark capture for the default pair.

| Id | Heading | Body | Character |
|---|---|---|---|
| `sora` | Sora | Manrope | Airy geometric headings, calm wide body. |
| `rubik` | Rubik | Lexend | Rounded headings, body built for reading ease. |
| `open` | Open Sans | Open Sans | Humanist, neutral, one variable family. |
| `jakarta` | Plus Jakarta Sans | Figtree | Rounded, consumer feel. |
| `outfit` | Outfit | Source Sans 3 | Geometric display, humanist body. |
| `grotesk` | Space Grotesk | IBM Plex Sans | Quirky terminals on the headings, sober body. |
| `dm` | DM Sans | DM Mono | One family. Calm, compact, easiest to scan in tables. Default. |

## Type specimen

![Sora + Manrope](../../design-system/preview/screenshots/type-sora.png)

![Rubik + Lexend](../../design-system/preview/screenshots/type-rubik.png)

![Open Sans](../../design-system/preview/screenshots/type-open.png)

![Plus Jakarta Sans + Figtree](../../design-system/preview/screenshots/type-jakarta.png)

![Outfit + Source Sans 3](../../design-system/preview/screenshots/type-outfit.png)

![Space Grotesk + IBM Plex Sans](../../design-system/preview/screenshots/type-grotesk.png)

![DM Sans + DM Mono](../../design-system/preview/screenshots/type-dm.png)

## Full page

| Pair | Light | Dark |
|---|---|---|
| sora | [light](../../design-system/preview/screenshots/font-sora-light.png) | |
| rubik | [light](../../design-system/preview/screenshots/font-rubik-light.png) | |
| open | [light](../../design-system/preview/screenshots/font-open-light.png) | |
| jakarta | [light](../../design-system/preview/screenshots/font-jakarta-light.png) | |
| outfit | [light](../../design-system/preview/screenshots/font-outfit-light.png) | |
| grotesk | [light](../../design-system/preview/screenshots/font-grotesk-light.png) | |
| dm | [light](../../design-system/preview/screenshots/font-dm-light.png) | [dark](../../design-system/preview/screenshots/font-dm-dark.png) |

## Recommendation

`dm` is the default: compact digits and calm tone for tables. Mono is used only for raw JSON and ids. Change `defaultFontPairId` in `design-system/src/tokens/typography.ts` to lock the choice.
