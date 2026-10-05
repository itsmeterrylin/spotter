# Linear gap audit

This audit compares every Spotter view against Linear's layout, type, and interaction patterns. It was run on 2026-10-05 against `http://localhost:3100` with demo data, at 1440 x 900 in the light and dark themes, plus 900 px width for the issues list, issue detail, and traces with the pane open. Measurements come from computed styles. Linear values come from `linear-reference.md` and the Linear screenshots in `.playwright-mcp/`.

Screenshots are in `/Users/terrylin/WorkoutVoice/.playwright-mcp/audit/`, named `<view>-<light|dark>.png`.

What already matches Linear: canvas, panel, border, and shadow tokens; the inset main panel (12 px radius, 1 px border, panel shadow); sidebar items (28 px, 8 px radius, 13 px/500); view tabs (28 px pills, 12 px/500); list rows (44 px) and group headers (36 px); the status popover (208 px, 12 px radius, popover shadow, 32 px items at 13 px/400, number keys); page titles (24 px/600); the 28 px status bar.

## 1. Summary: the 10 highest-value gaps

1. **No header bar on any view.** Linear puts breadcrumb, title context, and 28 px icon actions in a 44 px header. Spotter puts view tabs in that slot and pushes breadcrumbs, titles, and actions into the page body in three different forms. Views: all. Fix: one `Header` component (breadcrumb left, icon actions right, view tabs as a second row or inline), and remove in-body crumbs.
2. **Three list patterns.** Issues and judges use `.list-row` with group headers and keyboard. Traces, runs, datasets, dataset items, and settings use `<table>`. Run detail, notifications, and the issue Traces and Backtest tabs use a third `.row` pattern. Fix: move every object list to `.list-row` with group headers, j/k, x, s, and Enter.
3. **Peek pane exists only on traces.** The owner decision requires a peek panel on every list. Issues, judges, runs, datasets, and run detail navigate away on click. Fix: generalize the `/traces/:id/pane` pattern into one `Peek` region that every list opens with Space or click.
4. **Right panel missing on four object pages.** Judge version, run detail, dataset detail, and review have no right panel. Their facts sit in stat cards, chip rows, or key-value blocks in the body. Fix: give each a right panel with editable properties, read-only facts, and relations, using the same single-row fields as the issue panel.
5. **Copper used as link text, plus underlined titles.** Trace ids, run names, dataset names, dataset sources, run detail ids, the seed trace link, "0 disagreements", and version "v1" are copper. Issue and judge row titles are always underlined (`text-decoration: underline` at rest). Linear shows titles in text primary, ids in text tertiary, and no underline at rest. Fix: ids tertiary, titles primary, underline on hover only, copper only for the brand mark and primary buttons.
6. **Section labels render their icon on its own line.** `.block-label` is `display: block` and its icon is a block, so the icon stacks above the label on issue overview (Seed trace), backtest (Run, Failing traces), judge overview, judge version, and review. The labels also sit 8 px to the right of the content they label. Fix: `.block-label { display: flex; align-items: center; gap: 6px; padding-inline: 0 }`.
7. **Keyboard model differs by view.** j/k, Enter, x, s, and Esc work on issues and judges only. Traces uses arrow keys and has no x or s. Runs, datasets, run detail, and the trace page have no list keys. Review uses Esc to leave the page. No view has prev/next between objects, a command menu, or go-to shortcuts. Fix: one shared list keymap on every list, j/k to step objects on detail pages, Esc closes and never navigates.
8. **Detail bodies use a centered narrow column.** Trace, judge overview, judge version, and review center a 610 to 750 px column that starts about 180 to 450 px right of the title. Issue detail uses full width with stat cards. Linear left-aligns the content column under the title. Fix: one detail layout, content left-aligned at the title's x with a max width, and no stat cards (their numbers move to the right panel).
9. **Error pages.** An unknown route returns plain-text "404 Not Found" outside the shell. An unknown object shows "Not here" with a "Runs" button. Compare with one run shows "Bad link" twice with no reason. Fix: route the catch-all through `ErrorPage`, say what was not found, and offer the parent list as the action.
10. **Narrow widths keep desktop chrome.** At 900 px the rail and sidebar still take 292 px (32 percent). The issue right panel drops below the body, so Status starts at y = 1028. The trace pane covers the status bar with no shadow or scrim. Fix: collapse the sidebar to a hover or toggle peek below about 1100 px, and make the right panel a toggleable overlay with a header icon button.

## 2. Per view

### Shell (all views)

Screenshot: `issues-light.png`, `issues-dark.png`

| Gap | Linear does | Spotter does | Fix | Effort |
|---|---|---|---|---|
| Header bar | 44 px header with breadcrumb, favorite, more, and right-aligned 28 px icon buttons | 45 px bar holds only view tabs; no breadcrumb or icon actions | Header component, tabs in a second row | M |
| Rail meaning | Not in Linear; owner wants it | First rail icon is an inbox glyph that links to Issues; search links to `/traces#sidebar-search`; settings is a slider glyph | Inbox glyph goes to Inbox; Issues lives in the sidebar | S |
| Project switcher | 28 px switcher with menu | "concierge" is a plain `div` | `details` menu already styled in CSS; wire it | S |
| Sidebar search | Search is an icon button next to the switcher | 28 px input labelled "Search traces" on every page | Icon button or command menu; scope the label to the current view | S |
| Status bar | Linear has none; owner wants it | 12 px tertiary, fine | None | |

### Issues list (Open, Confirmed, Dismissed tabs)

Screenshots: `issues-light.png`, `issues-dark.png`, `issues-confirmed-*.png`, `issues-dismissed-*.png`, `issues-status-menu-light.png`, `issues-bulk-light.png`, `issues-900-*.png`

| Gap | Linear does | Spotter does | Fix | Effort |
|---|---|---|---|---|
| Big title on a list | No page title on lists; header breadcrumb names the view | 24 px "Issues" plus "1 open" above the list | Drop the in-body title; count lives in the tab | S |
| Row ids | Short id ("ABC-8") in tertiary before status | No short id at all | Add a short issue key, tertiary 13 px/450 | M |
| Title style | Text primary, no underline | Underlined at rest | Underline on hover only | S |
| Focus marker | Background tint only | Background plus a 2 px copper left border | Drop the border | S |
| Severity chip | Priority icon in a fixed column | Red "high" pill in the meta cluster | Priority-style icon column | S |
| Dismiss reason | n/a | Dismissed rows do not show why | Show reason in tertiary meta | S |
| Bulk bar | Pinned to the bottom center of the panel | Sits inline 16 px under the last row until the list overflows | `position: fixed` within the panel | S |
| Peek | Space opens a peek | Not available | Shared peek | M |
| Keyboard | j/k, x, s, Enter, Esc | Matches | None | |

### Issue detail (Overview, Traces, Backtest)

Screenshots: `issue-overview-*.png`, `issue-overview-bottom-light.png`, `issue-traces-*.png`, `issue-backtest-*.png`, `issue-overview-900-*.png`

| Gap | Linear does | Spotter does | Fix | Effort |
|---|---|---|---|---|
| Breadcrumb | Header: project > Issues > id title, with "2 / 9" and up/down | "Issues" crumb above the title in the body; no position or prev/next | Header breadcrumb with prev/next | M |
| Stat cards | None; numbers live in properties | Three cards (Occurrences, Traces affected, Severity); severity repeats the panel | Remove cards; move counts to panel facts | S |
| Status group | Status is the first row of Properties | Separate "Status" group above Properties | Merge into Properties | S |
| Severity field | Single-row button that opens a popover | Native `<select>` with a chevron | Popover like status | S |
| Judge link (Backtest) | Relations set from the panel | Full-width native `<select>` plus "Link" and "Judges" in the body | Relation row in the panel with a popover | M |
| Section labels | 15 px/600 heading, inline | Icon stacked above label, label 8 px right of body | `.block-label` flex fix | S |
| Seed trace link | Text primary | Copper, underlined | Tertiary id, hover underline | S |
| Occurrence lists | One list pattern | `.row` with copper-tinted icon circles; ids in text primary mono | `.list-row`, tertiary ids, plain icons | M |
| Duplicate lists | n/a | "Recent occurrences" in the panel repeats the Traces tab | Keep a count in the panel, list in the tab | S |
| Activity | Activity feed and comment box | None | Activity section (status changes, labels) | L |
| Dark theme | Dividers visible | Turn dividers and the focused turn nearly vanish | Raise `--border-subtle` and focus fill in dark | S |
| 900 px | Panel toggles as an overlay | Panel drops below body; Status at y = 1028 | Overlay panel with header toggle | M |

### Traces list (All, Unlabeled) and peek pane

Screenshots: `traces-*.png`, `traces-unlabeled-light.png`, `traces-pane-*.png`, `traces-pane-900-*.png`

| Gap | Linear does | Spotter does | Fix | Effort |
|---|---|---|---|---|
| List pattern | 44 px list rows, group headers | `<table>` with column headers, no groups | `.list-row`, group by verdict | M |
| Ids and run names | Tertiary text | Copper mono ids and copper run links in every row | Tertiary ids; run as a tertiary chip | S |
| Tab counts | Counts on tabs | No counts on All or Unlabeled (issues and judges have them) | Add counts | S |
| Keyboard | j/k moves focus, Space peeks | Arrow keys open the pane; j/k and x and s do nothing | Shared keymap | S |
| Pane width | Peek width matches detail panel | 440 px, detail right panel is 386 px | One width token | S |
| Pane header | Breadcrumb-like id plus icon buttons | Id, run chip, copper "New issue" pill, three 28 px icons | Keep icons; make "New issue" an icon button or menu item | S |
| Pane body | Properties then content | "Output" repeats the last assistant turn | Drop Output when it equals the last turn | S |
| Selected row in dark | Visible tint | Nearly invisible | Stronger dark `--fill-strong` | S |
| 900 px | Overlay with shadow | Fixed overlay, no shadow, covers status bar; table clipped to one column | Popover shadow, stop above status bar | S |

### Trace page (`/traces/:id?turn=`)

Screenshots: `trace-light.png`, `trace-dark.png`

| Gap | Linear does | Spotter does | Fix | Effort |
|---|---|---|---|---|
| Breadcrumb | Header breadcrumb | In-body "Runs → prod-2026-10-01" with an arrow icon (issue detail uses a bare "Issues" crumb); sidebar highlights Traces | Header breadcrumb: Traces > id | S |
| Actions | 28 px icon buttons in the header | "Label" and copper "New issue" text buttons beside the title | Header icon buttons | S |
| Tabs | Detail pages share a tab row | No tab row (issue and judge detail have one) | Add a tab row or omit consistently | S |
| Body column | Left-aligned under the title | Centered 610 px column starting 180 px right of the title | Shared detail layout | M |
| Turn keys | j/k step items | `?turn=` sets focus but j/k do nothing | j/k across turns, f to flag | S |
| Panel | Properties, labels, relations | Properties plus "Issues: No issues"; verdict is the only editable field | Fine; add relation to dataset item when present | S |

### Judges list (Live, Draft, Paused, All)

Screenshots: `judges-light.png`, `judges-dark.png`, `judges-live-empty-light.png`

| Gap | Linear does | Spotter does | Fix | Effort |
|---|---|---|---|---|
| Title | No in-body title | "Judges" 24 px plus count | Drop | S |
| Title style | No underline | Underlined at rest | Hover only | S |
| Empty state | Centered on the panel, no card, one line plus action | White card with icon and "No live judges", no action | Shared empty state without card, with a next step | S |
| Peek | Available | Not available | Shared peek | M |
| Keyboard | Matches | j/k, x, s work | None | |

### Judge detail (Overview, Versions, Disagreements, Issues)

Screenshots: `judge-light.png`, `judge-dark.png`, `judge-versions-light.png`, `judge-disagreements-light.png`, `judge-issues-light.png`

| Gap | Linear does | Spotter does | Fix | Effort |
|---|---|---|---|---|
| Body column | Left-aligned | Overview centers a column 184 px right of the title | Shared detail layout | M |
| Duplicate facts | Facts once, in the panel | Definition block (scope, model, created) repeats the panel | Body keeps prompt and params only | S |
| Chips row | None | "Active", "Needs labels", copper "0 disagreements" chips under the title | Move to panel facts | S |
| Panel fields | Single-row fields | "Needs labels" renders as a tinted pill inside Properties; TPR and TNR use a check icon | Plain row with a status icon; a metric icon for TPR/TNR | S |
| Version picker | Popover | "v1" with a chevron, native-select style | Popover | S |
| Versions tab | List rows | One card with a copper border, copper underlined "v1", a stretched "Needs labels" bar | `.list-row` per version | M |
| Issues tab | Same row as issues list | Same row but title not underlined (issues list underlines) | Converge on no underline | S |
| Disagreements empty | No card | White card | Shared empty state | S |
| Status popover | s opens it | Works | None | |

### Judge version page (`/judges/:name/versions/:n`)

Screenshots: `judge-version-light.png`, `judge-version-dark.png`

| Gap | Linear does | Spotter does | Fix | Effort |
|---|---|---|---|---|
| Right panel | Every object has one | None | Panel with version facts and relations (judge, parent, disagreements) | M |
| Layout | Left-aligned | Centered column starting 450 px right of the title | Shared detail layout | M |
| Breadcrumb | Header | In-body with arrow icon | Header | S |
| Section labels | Inline | Icons stacked above labels | `.block-label` fix | S |

### Review (`/review/:id`, `/review?filter=`)

Screenshots: `review-light.png`, `review-dark.png`, `review-queue-dark.png`, `judge-disagreements-page-dark.png`

| Gap | Linear does | Spotter does | Fix | Effort |
|---|---|---|---|---|
| Queue entry | "My issues" style queue in the sidebar | No sidebar entry; `/review` redirects to the first trace | "My review queue" sidebar item with a count | M |
| Title | Object title | Generic "Review"; crumb says Runs while the sidebar highlights Traces | Title is the trace id; header shows queue position | S |
| Verdict buttons | 28 px controls | 44 px saturated pills, twice (turn row 72 to 78 px wide, trace row 136 px) | One row of 28 px buttons with key hints | S |
| Focus ring | 1 px focus ring | 1 px copper outline offset 6 px around the button row | Standard focus ring | S |
| Right panel | Properties panel | None | Reuse the trace panel | M |
| Esc | Closes overlays | Leaves the page | Esc closes only; a separate key exits | S |
| Layout | Left-aligned | Centered column 450 px right of title | Shared detail layout | M |

### Runs list

Screenshots: `runs-light.png`, `runs-dark.png`

| Gap | Linear does | Spotter does | Fix | Effort |
|---|---|---|---|---|
| Tabs strip | Every list has a header and tab row | No tab strip and no count line (issues, traces, judges have both) | Header plus tabs (for example Running, Done) | S |
| List pattern | List rows | `<table>` | `.list-row` | M |
| Link color | Primary title | Copper run and dataset names | Primary title, tertiary dataset | S |
| Column alignment | n/a | "Started" header left-aligned, value right-aligned | Align | S |
| Status | Neutral in-progress icon | "Running" in a copper-red pill | Neutral running icon | S |
| Keyboard | j/k, Enter | Click only | Shared keymap | S |

### Run detail

Screenshots: `run-light.png`, `run-dark.png`

| Gap | Linear does | Spotter does | Fix | Effort |
|---|---|---|---|---|
| Right panel | Present | None | Panel: dataset, started, status, pass rate, baseline, compare | M |
| Stat cards | None | Score card with a copper border and an underlined "50%", plus an Items card | Panel facts; score switcher as a view option | S |
| Rows | `.list-row`, 8 px gaps | Third `.row` pattern; copper underlined id with no gap before the output text | `.list-row`, tertiary id, 8 px gap | M |
| Peek | Available | Not available | Shared trace peek | M |
| Keyboard | j/k | None | Shared keymap | S |

### Compare (`/datasets/:id/compare`)

Screenshots: `compare-light.png`, `compare-dark.png` (error state only)

The demo data has one run, so the compare view could not be reached with two runs. Source (`Compare.tsx`) shows a `<table>` in a card with run pills and a toggle, which is the table pattern from gap 2. The error state reads "Bad link" twice with a "Runs" button and no reason. Fix: say "Compare needs two runs on this dataset" and link to the dataset. Effort S.

### Datasets list

Screenshots: `datasets-light.png`, `datasets-dark.png`

| Gap | Linear does | Spotter does | Fix | Effort |
|---|---|---|---|---|
| Header and tabs | Present | Title only, no count | Header | S |
| List pattern | List rows | `<table>`, copper names and copper last-run link | `.list-row` | M |
| Peek | Available | Not available | Shared peek | M |

### Dataset detail and items

Screenshots: `dataset-light.png`, `dataset2-light.png`, `dataset-dark.png`, `dataset2-dark.png`

| Gap | Linear does | Spotter does | Fix | Effort |
|---|---|---|---|---|
| Right panel | Present | None | Panel: item count, runs, last run, created | M |
| Tabs | Sections as tabs | Items and Runs stacked as h2 sections | Tabs: Items, Runs | S |
| Item page | Each object opens | `/datasets/:id/items` redirects to the dataset; no item page or peek | Item peek with input, expected, source trace | M |
| Empty values | Consistent dash | Empty Expected cells are blank; other tables use "–" | Shared empty-cell token | S |
| Runs table | n/a | Repeats a Dataset column inside a dataset | Drop the column | S |
| Empty states | No card | White cards for "No items yet" and "No runs yet" | Shared empty state | S |

### Notifications and inbox

Screenshots: `notifications-light.png`, `notifications-dark.png`

| Gap | Linear does | Spotter does | Fix | Effort |
|---|---|---|---|---|
| Inbox model | Two-pane inbox: list left, preview right, read state, snooze | `/inbox` redirects to `/notifications`; one list of `.row` items each with a copper "Label" button | Inbox list with peek and read state | L |
| Actions | Row click opens; actions on hover | Primary copper button on every row | Row click opens; hover action | S |
| Header | Header with filter and display icons | Title only | Header | S |

### Settings

Screenshots: `settings-light.png`, `settings-dark.png`

| Gap | Linear does | Spotter does | Fix | Effort |
|---|---|---|---|---|
| Navigation | Settings replaces the sidebar with a settings nav | One long page; sidebar keeps project nav | Settings nav in the sidebar, one page per section | M |
| Headings | 15 px section headings | 18 px/600 with unrelated icons (person for Appearance, judge for Agents) | 15 px/600, no icons | S |
| Spacing | Groups 10 to 24 px apart | 64 px gaps and a 100 px empty band inside the Agents card | Tighten | S |
| Rows | Label left, control right, one row each | Key-value grid plus a separate code block | Single-row settings | S |

### 404 and error pages

Screenshots: `404-light.png`, `404-dark.png`, `404-object-light.png`

| Gap | Linear does | Spotter does | Fix | Effort |
|---|---|---|---|---|
| Unknown route | In-shell not-found page | Plain-text "404 Not Found" with no shell or styles; the tab title is the URL | Catch-all route to `ErrorPage` | S |
| Unknown object | Names the missing object, links its list | "Not here" in a white card, action is always "Runs" | Name the object and link its list | S |

## 3. Cross-cutting inconsistencies

| Pattern | Variant | Views |
|---|---|---|
| Object lists | `.list-row` with group headers and keymap | Issues list, judges list, judge Issues tab |
| | `<table>` | Traces, runs, datasets, dataset items, dataset runs, compare, settings tools |
| | `.row` | Run detail, notifications, issue Traces tab, issue Backtest list, issue panel occurrences |
| | Card | Judge Versions tab |
| Breadcrumb | None | Issues, traces, judges, runs, datasets, notifications, settings lists |
| | Bare crumb above title, no separator | Issue detail, judge detail, run detail, dataset detail |
| | Crumb with arrow icon | Trace page, judge version, review |
| Detail body | Full width with stat cards | Issue detail, run detail |
| | Centered narrow column | Trace page, judge overview, judge version, review |
| | Full width sections | Dataset detail |
| Right panel | Present | Issue detail, judge detail, trace page, trace pane |
| | Missing | Judge version, run detail, dataset detail, review |
| Tab strip | Present with counts | Issues list, judges list, issue detail, judge detail |
| | Present without counts | Traces list |
| | Missing | Runs, datasets, run detail, dataset detail, trace page, judge version, review, notifications, settings |
| Primary actions | Copper pill in body | Issue overview (Backtest), trace page and pane (New issue), notifications (Label), run detail (Compare), error pages |
| | 28 px icon buttons | Trace pane only |
| List keys | j/k, x, s, Enter, Esc | Issues, judges |
| | Arrows, Enter, Esc | Traces |
| | 1, 2, d, u, a, arrows, Esc leaves page | Review |
| | None | Runs, datasets, run detail, dataset detail, notifications, trace page |
| Empty states | White card, icon, one line, no action | Judges tabs, judge Disagreements, dataset items and runs, compare error, object 404 |
| Copper text | Links and ids | Traces, runs, datasets, dataset detail, run detail, issue seed trace, judge chips and versions |
| Underline at rest | Row titles and links | Issues list, judges list, run detail ids, seed trace, run score card |
| Panel width | 386 px | Issue, judge, trace detail panels |
| | 440 px | Trace pane |

## 4. Not built yet versus owner decisions

| Owner decision | Current state | Gap |
|---|---|---|
| Sidebar: Inbox and My review queue on top | Flat list of Issues, Traces, Judges, Runs, Datasets; Inbox is a rail icon that goes to Notifications; no review queue entry | Not built |
| Sidebar: Projects, each expanding to Issues, Traces, Judges, Runs, Datasets, Views | One project name as plain text; no expand, no Views | Not built |
| Sidebar: Settings at the end | Settings is a rail icon only | Not built |
| Peek panel on every list | Traces only | Missing on issues, judges, runs, datasets, dataset items, run detail rows, notifications |
| Right panel on every object detail page | Issue, judge, trace | Missing on judge version, run, dataset, dataset item (no page), review |
| Right panel groups: editable properties, read-only facts, relations | Issue and judge have Properties and Relations; Status is its own group; trace has Properties and Issues | Merge Status into Properties; add a Relations group to the trace panel |
| Linear single-row inline fields | Issue status is single-row; severity and judge version use native-select styling; judge "Needs labels" is a pill | Convert to single-row buttons with popovers |
| Status changes through the status popover | Issues list, issue detail, judge detail | Runs have a status but no popover (read-only is fine if runs are never edited) |
| Six-region shell | Rail, sidebar, tabs, main, right panel, status bar all present on issue and judge detail | Tabs region missing on most views (see section 3) |
| Open Sans | Used everywhere | Intentional, not a gap |
