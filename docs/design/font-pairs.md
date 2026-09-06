# Type decision

**Decision (2026-09-06)**: one family, Open Sans, weights 400 to 800. No display face. Mono is the system monospace stack, used only for raw JSON and ids.

Why one family: the screens are tables, numbers, and verdicts. Size and weight carry the hierarchy. One family keeps x-height and widths consistent from a 96px stat down to a 16px caption, loads one file, and cannot clash.

Why Open Sans: humanist letterforms with open apertures, a tall x-height, distinct `1` `l` `I`, and a real 800 weight for stat numbers. It reads as neutral and calm rather than technical.

![Open Sans, light](../../design-system/preview/screenshots/type-open.png)

Full page: [light](../../design-system/preview/screenshots/font-open-light.png), [dark](../../design-system/preview/screenshots/font-open-dark.png).

## Candidates compared

| Heading | Body | Outcome |
|---|---|---|
| Open Sans | Open Sans | Chosen |
| DM Sans | DM Sans | Close second. Geometric `0` and `O` sit near each other. |
| Sora | Manrope | Airy, but wide letterforms cost table columns. |
| Rubik | Lexend | Friendly. Lexend spacing is tuned for prose, not tables. |
| Plus Jakarta Sans | Figtree | Rounded shapes blur at 16px in dense rows. |
| Outfit | Source Sans 3 | Strong for data, more display voice than needed. |
| Space Grotesk | IBM Plex Sans | Best digits, most engineering in tone. |
| Cooper Hewitt | San Francisco, Figtree | Dropped: too serious, and San Francisco has no web download. |
| Fraunces | Work Sans | Dropped: no serifs. |
| Plus Jakarta Sans, Cooper Hewitt | Inter | Dropped: no Inter. |

To compare another family, add an entry to `fontPairs` in `design-system/src/tokens/typography.ts`; the preview shows a switcher when more than one entry exists.
