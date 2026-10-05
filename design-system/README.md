# Spotter design system

One tokens file, one generated CSS file, seven components, eight shell components. The class names are the contract.

```bash
npm run build       # dist/spotter.css, dist/tokens.json, preview/index.html, preview/prototype.html
npm run build:docs  # dist/docs/*.html from docs/
npm run check       # type-check
npm run check:deps  # 60-day release-age gate
```

## Rules

| Rule | Value |
|---|---|
| Type | Open Sans. caption 13, body 15, title 22, stat 44. Weights 400, 600, 800. |
| Mono | System monospace. Raw JSON and ids only. |
| Color | 10 roles: canvas, surface, border, ink, ink-muted, brand, pass, fail, defer, focus. Tints via `color-mix`. Light and dark. |
| Space | 4, 8, 12, 16, 24, 32, 48, 64 |
| Radius | 10, and pill. No shadows. |
| Controls | 40px, 32px compact, 44px rows, 40px list rows. One primary action per screen. |
| Shell | Rail 56, sidebar 248, aside 300 (wide 440), status bar 32. Hairline borders, no shadows. |

## Components

| Class | Variants |
|---|---|
| `.btn` | `-primary` `-secondary` `-ghost` `-pass` `-fail` `-defer` `-compact` `-icon`, `aria-pressed` |
| `.pill` | `-pass` `-fail` `-defer` `-brand` `-lg` |
| `.card` | `-flush` |
| `.row` | child `.grow` |
| `.table` | cell `.num` |
| `.input`, `.field` | textarea |
| `.kbd` | |

Shell components:

| Class | Holds |
|---|---|
| `.rail`, `.rail-btn`, `.avatar` | Icon-only left rail; `aria-current="page"` marks the active button |
| `.nav2` | Two-line sidebar item: `.dot` icon circle, `.label`, `.meta` |
| `.tabs`, `.tab` | Section tabs; child `.count`; `aria-current="page"` |
| `.aside` | Right sidebar; `-wide`; `h2` section labels |
| `.prop` | Property row: `dt`/`.key`, `dd`/`.value` |
| `.statusbar` | Bottom bar with left and right groups |
| `.state` | Issue status circle: `-confirmed` `-dismissed`; plain is open |
| `.list-row` | Dense list row; child `.grow` `.meta`; `data-focus` |

Utilities: `.t-caption` `.t-body` `.t-title` `.t-stat`, `.strong` `.heavy` `.muted` `.mono` `.num` `.link` `.pos` `.neg`, `.stack` `.cluster` `.container` `.narrow` `.scroll-x`, `.ic` `.ic-sm` `.ic-lg`, `.bar`.

## Files

| File | Holds |
|---|---|
| `src/tokens.ts` | Every token |
| `src/css.ts` | The generator |
| `src/icons.ts` | 36 icons named by meaning |
| `src/build.ts` | Builds CSS and the two preview pages |
| `src/build-docs.ts` | Renders markdown docs with the system |
| `preview/template.html` | System preview |
| `preview/prototype.template.html` | Clickable prototype |
