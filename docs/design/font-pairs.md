# Font pairs

Eight candidates, all sans-serif. Toggle between them in `design-system/preview/index.html`. Screenshots are 1440px wide, light theme, captured on macOS so San Francisco renders as SF Pro. One dark capture for the default pair.

| Id | Heading | Body | Character |
|---|---|---|---|
| `sora` | Sora | Manrope | Airy geometric headings, calm wide body. Default. |
| `rubik` | Rubik | Lexend | Rounded headings, body built for reading ease. |
| `open` | Open Sans | Open Sans | Humanist, neutral, one variable family. |
| `sf` | San Francisco | San Francisco | Pure Apple. Segoe or Roboto on other platforms. |
| `jakarta` | Plus Jakarta Sans | Figtree | Rounded, consumer feel. |
| `outfit` | Outfit | Source Sans 3 | Geometric display, humanist body. |
| `grotesk` | Space Grotesk | IBM Plex Sans | Quirky terminals on the headings, sober body. |
| `dm` | DM Sans | DM Mono | One family. Calm, low contrast between roles. |

San Francisco has no web download. The stack is `-apple-system, "SF Pro Text", system-ui`, so it resolves to SF on Apple devices and to the platform sans elsewhere.

## Type specimen

![Sora + Manrope](../../design-system/preview/screenshots/type-sora.png)

![Rubik + Lexend](../../design-system/preview/screenshots/type-rubik.png)

![Open Sans](../../design-system/preview/screenshots/type-open.png)

![San Francisco](../../design-system/preview/screenshots/type-sf.png)

![Plus Jakarta Sans + Figtree](../../design-system/preview/screenshots/type-jakarta.png)

![Outfit + Source Sans 3](../../design-system/preview/screenshots/type-outfit.png)

![Space Grotesk + IBM Plex Sans](../../design-system/preview/screenshots/type-grotesk.png)

![DM Sans + DM Mono](../../design-system/preview/screenshots/type-dm.png)

## Full page

| Pair | Light | Dark |
|---|---|---|
| sora | [light](../../design-system/preview/screenshots/font-sora-light.png) | [dark](../../design-system/preview/screenshots/font-sora-dark.png) |
| rubik | [light](../../design-system/preview/screenshots/font-rubik-light.png) | |
| open | [light](../../design-system/preview/screenshots/font-open-light.png) | |
| sf | [light](../../design-system/preview/screenshots/font-sf-light.png) | |
| jakarta | [light](../../design-system/preview/screenshots/font-jakarta-light.png) | |
| outfit | [light](../../design-system/preview/screenshots/font-outfit-light.png) | |
| grotesk | [light](../../design-system/preview/screenshots/font-grotesk-light.png) | |
| dm | [light](../../design-system/preview/screenshots/font-dm-light.png) | |

## Recommendation

`sora` as the default. `rubik` if the review screen needs to feel even lighter. Change `defaultFontPairId` in `design-system/src/tokens/typography.ts` to lock the choice.
