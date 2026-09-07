# Spotter design system

One tokens file, one generated CSS file, seven components. The class names are the contract.

```bash
npm run build       # dist/spotter.css, dist/tokens.json, preview/index.html, preview/prototype.html
npm run build:docs  # dist/docs/*.html from docs/
npm run check       # type-check
npm run check:deps  # 60-day release-age gate
```

## Rules

| Rule | Value |
|---|---|
| Type | Open Sans. caption 16, body 18, title 28, stat 64. Weights 400, 600, 800. |
| Mono | System monospace. Raw JSON and ids only. |
| Color | 10 roles: canvas, surface, border, ink, ink-muted, brand, pass, fail, defer, focus. Tints via `color-mix`. Light and dark. |
| Space | 8, 16, 32, 64 |
| Radius | 16, and pill. No shadows. |
| Controls | 56px, 48px compact, 72px rows. One primary action per screen. |

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

Utilities: `.t-caption` `.t-body` `.t-title` `.t-stat`, `.strong` `.heavy` `.muted` `.mono` `.num` `.link` `.pos` `.neg`, `.stack` `.cluster` `.container` `.narrow` `.scroll-x`, `.ic` `.ic-sm` `.ic-lg`, `.bar`.

## Files

| File | Holds |
|---|---|
| `src/tokens.ts` | Every token |
| `src/css.ts` | The generator |
| `src/icons.ts` | 26 icons named by meaning |
| `src/build.ts` | Builds CSS and the two preview pages |
| `src/build-docs.ts` | Renders markdown docs with the system |
| `preview/template.html` | System preview |
| `preview/prototype.template.html` | Clickable prototype |
