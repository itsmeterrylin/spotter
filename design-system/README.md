# Spotter design system

One tokens file, one generated CSS file, seven components, shell components. The class names are the contract.

```bash
npm run build       # dist/spotter.css, dist/tokens.json, preview/index.html, preview/prototype.html
npm run build:docs  # dist/docs/*.html from docs/
npm run check       # type-check
npm run check:deps  # 60-day release-age gate
```

## Rules

| Rule | Value |
|---|---|
| Type | Open Sans variable (wght 300..800). meta 12, ui 13, content 15, heading 18, title 24, stat 32. Weights 400, 450, 500, 550, 600. |
| Mono | System monospace. Raw JSON and ids only. |
| Color | 16 roles: canvas, surface (panel), raised, fill, fill-strong, border, border-subtle, ink, ink-secondary, ink-muted, ink-faint, brand, pass, fail, defer, focus. Neutrals are Linear's. Tints via `color-mix`. Light and dark. |
| Space | 4, 6, 8, 10, 12, 16, 24, 32, 48, 64 |
| Radius | 8 control, 12 panel and menu, 10 workspace switcher, pill. |
| Shadow | Two: panel (cards, buttons, the main panel) and popover (menus, pickers). |
| Controls | 28px buttons, inputs, tabs, nav items, property buttons. 24px chips. 32px menu items. 36px group headers. 44px rows. One primary action per screen. |
| Icons | 14, 16, 20 rendered. Stroke 2 on the 24 grid. They take the color of the adjacent text. |
| Shell | Rail 48 and sidebar 244 on the canvas, no borders. Tabs, main, and aside form one inset panel (8px from top and right, radius 12). Aside and peek panel 386. Status bar 28 below the panel. |
| Source | Measured values and their rationale: `docs/design/linear-reference.md`. |

## Components

| Class | Variants |
|---|---|
| `.btn` | `-primary` `-secondary` `-ghost` `-pass` `-fail` `-defer` `-icon`, `aria-pressed` |
| `.pill` | `-pass` `-fail` `-defer` `-brand` `-lg` |
| `.card` | `-flush` (no chrome, for lists and tables) |
| `.row` | child `.grow` |
| `.table` | cell `.num` |
| `.input`, `.field` | textarea |
| `.kbd` | |

Shell components:

| Class | Holds |
|---|---|
| `.rail`, `.rail-btn`, `.avatar` | Icon-only left rail; `aria-current="page"` marks the active button |
| `.nav2` | One-line sidebar item: icon, `.label`, trailing `.meta` count |
| `.tabs`, `.tab` | Pill tabs; child `.count`; `aria-current="page"` |
| `.aside` | Right sidebar. `.panel-body` holds one object's Status, Properties, and Relations groups with `h2` labels |
| `.prop`, `.propbtn` | Property group: label `dt`/`.key` over a 28px pill value `dd`/`.value` |
| `.statusbar` | Bottom bar with left and right groups |
| `.state` | Issue status circle: `-confirmed` `-dismissed`; plain is open |
| `.list-row` | 44px list row; child `.grow` `.meta`; `data-focus` |
| `.group-head` | 36px group header with `.count` |
| `.menu-panel` | Popover menu; children `.nav2` become 32px items |

Utilities: `.t-meta` `.t-ui` `.t-content` `.t-heading` `.t-title` `.t-stat`, `.strong` `.bold` `.muted` `.faint` `.mono` `.num` `.link` `.pos` `.neg`, `.stack` `.cluster` `.container` `.narrow` `.scroll-x`, `.ic` `.ic-sm` `.ic-lg`, `.bar`.

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
