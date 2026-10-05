# Linear interaction patterns for Spotter

This page records how Linear's web app behaves, so Spotter can copy the behavior and not only the look. [Linear UI measurements](linear-reference.md) holds the static tokens. This page holds behavior: collapse, panels, create and edit flows, and the sidebar tree.

Values come from Linear's web app on 2026-10-05, at a 1440 x 900 viewport in the light theme, measured with `getComputedStyle` and `getBoundingClientRect`. Where a value is an observation and not a measurement, the text says so.

## Sidebar collapse

### What Linear does

Linear has one left sidebar. It is docked or hidden. It has no icon-only rail state.

| Behavior | Linear |
|---|---|
| Docked width | 244px by default. The right edge is a 7px drag handle (`col-resize`) that resizes the sidebar between 192px and 330px. |
| Collapsed width | 0. The sidebar slides out by `translateX(-(width + 16px))`, so -260px at the default width. Nothing stays on screen. |
| Main panel, docked | x = 244, width 1188 at a 1440 viewport. |
| Main panel, collapsed | x = 8, width 1424. The panel keeps its 8px inset on every side. |
| Push or overlay | Docked: push. The main panel moves and resizes with the sidebar. Peek: overlay. The main panel stays at x = 8. |
| Transition | About 330ms from start to rest, in both directions. The curve is a decelerating ease-out: half the distance in the first 100ms, then a long settle. The panel and sidebar move together. JavaScript drives it; the CSS `transition` value is `all` with no duration. |
| Persistence | Stored in local user settings as `sidebarCollapsed` and `sidebarWidth`. Both survive a reload and a new tab. |

#### Ways to collapse and re-open

| Trigger | Effect |
|---|---|
| `[` key | Toggles the sidebar, docked to hidden and back. Linear's shortcut help lists it as "Toggle left sidebar". It works when focus is not in a text field. |
| Cmd + `\` | Not a Linear shortcut. Linear's shortcut help lists only `[`. |
| Header toggle button | When the sidebar is hidden, a 28px "Menu" button appears at the left of the header bar, at x = 16, before the breadcrumb. Its tooltip reads "Expand navigation sidebar `[`". Clicking it docks the sidebar. Linear shows no collapse button while the sidebar is docked; the docked sidebar collapses only by key. |
| Hover peek | When hidden, moving the pointer to the left screen edge (x = 2) or hovering the header toggle button opens the sidebar as an overlay. Hovering at x = 20 does not open it. |
| Drag handle | Resizes only. Dragging toward the left stops at 192px; it does not collapse. |

#### Hover peek

| Property | Value |
|---|---|
| Delay | About 250ms of hover before the sidebar starts to move. |
| Open time | Fully open about 600ms after the pointer arrives, so about 300ms of motion. |
| Close | Starts at once when the pointer leaves, and finishes in about 320ms. |
| Geometry | Same width as docked. It starts below the header row, at y = 41.5, height 858.5 at a 900px viewport. Corner radius `0 12px 12px 0`. |
| Surface | The peek sidebar uses the panel color, not the page canvas color it has when docked. |
| Scrim | The rest of the window dims behind it. The main panel does not move. |
| Ending a peek | Move the pointer out. Click the header toggle or press `[` to dock it. |

#### Views that auto-collapse

None. Opening Inbox, My issues, Projects, Views, a team's issue list, an issue, a project, and the team page all left the docked sidebar at x = 0 and width 244. Settings does not collapse it either. It keeps the same 244px frame and swaps the content for a settings tree with a "Back to app" link at the top.

#### Narrow windows

| Viewport | Sidebar | Main panel | Issue right panel |
|---|---|---|---|
| 1440 | docked, 244px | 1188px | 376px column |
| 1100 | docked, 244px | 848px | about 287px column |
| 1080 | docked, 244px | 828px | 282px column |
| 1060 and below | docked, 244px | 808px or less | hidden. Status, priority, assignee, and labels move to a row of chips under the issue title. |
| 900 | docked, 244px | 648px | hidden, chips under the title |

The sidebar never collapses on its own at these widths. Only the issue's right panel adapts. It scales with the main panel at about 32% of its width, then disappears when the main panel drops below about 820px.

### Recommendation for Spotter

Spotter today has a 44px icon rail and a 244px section sidebar. Keep the rail. Make the 244px sidebar collapsible, the way Linear's is.

1. Bind `[` to toggle the sidebar. Store the state per browser in `localStorage`, read before first paint so the page does not jump.
2. When the sidebar is hidden, show a 28px toggle button at the left of the header bar. Its tooltip names the key.
3. Animate `transform` on the sidebar and `margin-left` or grid columns on the main panel together, for 300ms with a decelerating ease-out. Respect `prefers-reduced-motion` by skipping the animation.
4. Add hover peek on the left edge with a 250ms delay, as an overlay with a scrim. Skip it if it costs more than a day; the key and the button are the core.
5. Do not resize the sidebar by drag in the first version.

Which Spotter pages should collapse it: Linear never auto-collapses, and Spotter should start the same way. A page that forces the sidebar closed surprises the PM and fights the saved preference. Instead, give these pages a layout that works well with the sidebar hidden, and let the PM press `[`:

| Spotter page | Why it benefits from a hidden sidebar |
|---|---|
| Trace transcript (`/traces/:id`) | The conversation column, plus the right panel, needs the width for long turns. |
| Review queue (`/review`, `/review/:id`) | Labeling is a focused loop of read, decide, next. |
| Compare (`/datasets/:id/compare`) | Side-by-side outputs need every pixel. |
| Issue detail (`/issues/:id`) | Optional. At 1440 it fits with the sidebar docked. |

If testing later shows that the PM always hides it on review, add a one-time "Hide sidebar while reviewing?" hint, not a silent auto-collapse.

## Keyboard

Shortcuts confirmed in Linear's shortcut help (Cmd + `/`) and, where marked, by pressing them.

| Scope | Key | Action | Tested |
|---|---|---|---|
| Global | Cmd + K | Command menu. It is scoped to the current object: on an issue it opens with a removable chip for that issue and lists issue actions first. | yes |
| Global | `/` | Search | no |
| Global | `?` | Help menu, with a "Keyboard shortcuts" entry | yes |
| Global | Cmd + `/` | Shortcut reference panel | yes |
| Global | `[` | Toggle left sidebar | yes |
| Global | `]` | Toggle right sidebar (details panel) | yes, on a list and on a project |
| Global | Esc | Back. On an issue page with no menu open, it returns to the list. | yes |
| Go to | G then I, M, A, B, E, P, S, X | Inbox, My issues, Active, Backlog, All issues, Projects, Settings, Archive | G then S tested |
| Open | O then I, P, V, F, T | Open issue, project, view, favorite, team (picker) | no |
| List | J or Down, K or Up | Move focus | Up tested in peek |
| List | Enter | Open the focused item | no, click tested |
| List | Space | Peek the focused item | yes |
| List | X | Select item | no |
| List | Shift + click | Select a range | no |
| List | Cmd + A, Cmd + Opt + A | Select all, select all in group | no |
| List | Shift + V | Display options | yes |
| List | F | Add filter | yes |
| List | Opt + Shift + F | Clear all filters | no |
| List | Cmd + B | Toggle list and board | no |
| List | Opt + Up or Down | Move one position | no |
| Issue | C | New issue | yes |
| Issue | S, P, A, L | Status, priority, assignee, labels popover | yes |
| Issue | I | Assign to me | yes |
| Issue | Shift + D | Due date | yes |
| Issue | Shift + P | Add to project | yes |
| Issue | M then R, M then B, M then X, M then M | Related, blocked by, blocking, duplicate of | M then R tested |
| Issue | Cmd + Shift + O | Create sub-issue | no, inline button tested |
| Issue | Opt + F | Favorite | no, star button tested |
| Issue | Shift + R | Rename | no |
| Issue | Cmd + Backspace | Delete | see CRUD |
| Issue | `#` | Restore a deleted issue | no |
| Issue | Ctrl + M | Comment | no, click tested |
| Issue | Cmd + Z | Undo the last property change | yes |
| Detail | Navigate up and down buttons, with a "10 / 11" counter in the header | Previous and next issue in the list you came from | observed |
| Project | Cmd + I | Open or close project details panel | tooltip observed |
| Inbox | E or Backspace, U, H, Shift + Backspace | Delete, read or unread, snooze, delete all read | no |

Hover and focus decide the target. List shortcuts act on the row under the pointer, so a stray `s` with the pointer on a row opens that row's status menu. Spotter should keep this behavior, because it is what makes the shortcuts fast.

## Right panel

### Linear's issue panel

The issue page's right panel is a plain column inside the main panel. It has no border, no background of its own, and no card. At a 1440 viewport it starts at x = 1008 and is 376px wide, with 51px of top padding so the first group label lines up with the issue title.

| Order | Group | Property | Empty state | Edit | Key |
|---|---|---|---|---|---|
| 1 | Properties | Status | Never empty | Popover anchored to the row | S |
| 2 | Properties | Priority | "Set priority", dashed icon | Popover | P |
| 3 | Properties | Assignee | "Assign", empty avatar | Popover. I assigns to me. | A, I |
| 4 | Properties | Due date | Row hidden until set | Popover with Custom, Tomorrow, End of this week, In one week | Shift + D |
| 5 | Labels | Label chips, then a "+" button | "Add label" | Multi-select popover with checkboxes. Typing a new name offers "Create new label", then asks for scope (workspace or team), then color. | L |
| 6 | Project | Project chip | "Add to project" | Popover, with "Create new project…" at the end | Shift + P |
| 7 | Related | One row per related issue | Group hidden until a relation exists | Search picker with "Create new issue related to…" | M then R |

Groups not seen in this workspace because the features are off: cycle, estimate, milestone, and SLA.

Layout numbers:

| Element | Value |
|---|---|
| Group label | 13px, weight 500, text tertiary, 16px line |
| Property row | 28px pill button, padding `0 10px 0 6px`, 32px pitch |
| Label to first row | 32px |
| Last row to next group label | 55px |
| Popover | 207px wide, anchored under the row, search field on top, options numbered 1 to n for keyboard picks |
| Hover | The row gets a pill background. Hovering status for a second shows a card with the time spent in each status and the S key. |

Every edit applies at once. There is no save button and no confirm. Each change adds a line to the activity feed. Cmd + Z reverts the last change and shows a toast that names it, such as "Undo set priority of ABC-11 to High."

The issue page has no toggle for this panel. `]` did nothing there at 1440. The panel adapts by width instead: it scales with the main panel, then disappears when the main panel is narrower than about 820px, and status, priority, assignee, and labels become a row of chips under the title.

### Linear's project panel

The project page uses a different panel: a stack of cards.

| Card | Contents |
|---|---|
| Properties | Two columns, label then value: Status, Priority, Lead, Members, Dates (start, arrow, target), Teams, Slack, Labels. The label column is 120px. Rows are 28px on a 36px pitch. |
| Milestones | One row per milestone with percent done, then "No milestone". A "+" in the card header adds one. |
| Progress | Scope and Completed counts, then a breakdown tab pair, Assignees and Labels. The card is hidden while the project has no issues. |
| Activity | The latest event and "See all". |

Each card is 388px wide, radius 10px, a 0.5px border, a white background, and the panel shadow. Each card header has a caret that collapses it. A header button, "Close project details" (Cmd + I), and the `]` key hide and show the whole stack. The choice is stored as `showProjectDetailPane`.

### Other pages

| Page | Right panel |
|---|---|
| Team home | A fixed column with Members and "Go to" links. No toggle. |
| Saved view | None. |
| Inbox | Two panes. The list is 400px; the right pane shows the selected notification or "No notification selected". |
| Document | Not tested. |

### List side panels: peek and details

Linear has two different side surfaces on a list, and neither is the issue panel.

| Surface | Open with | What it is |
|---|---|---|
| Peek | Space on the focused or hovered row | A floating read-only card, 416 x 153 at x = 1000, y = 88, radius 12px, popover shadow. It shows id, title, status with time in status, priority, and description. Up and Down move the peek to the next row. Esc closes it. |
| Details | "Open details" button at the top right, or `]` | A 428px card docked at the right, inset 8px, radius 10px. It pushes the list narrower. It holds a breakdown of the current list by Assignees, Labels, Priority, and Projects with counts, and a click filters the list. It is stored as `showIssuesDetailPane`. |

### Proposed Spotter panels

The owner decided two things. Every object's detail page has the right panel. List pages open a peek panel with the same fields when a row is selected. Spotter already has a peek pane on traces (`?peek=` and `?trace=` in the URL) and a properties column on the issue page, so this is a merge, not a new surface.

Spotter's peek should not copy Linear's floating card. Linear's peek is read-only and small, and the PM's work on a list is triage. Dock the peek at the right, 376px wide, and render the same panel component as the detail page, editable, so S, D, and the severity key work on the peeked row. Keep Linear's motion: Space opens it, Up and Down or J and K move it, Esc closes it.

Edit rights come from the token role. Agent tokens set agent-owned fields: tags, fix PR, release, and evidence. Only human tokens set status, verdict or label, severity, and activate a judge version. Fields that neither role edits in the UI are read-only facts. In the tables, "Human" and "Agent" name who may edit.

#### Issue panel

| Order | Group | Field | Today in Spotter | Edit | Who | Interaction to copy |
|---|---|---|---|---|---|---|
| 1 | Properties | Status: open, confirmed, dismissed | Radio list | Popover. Dismissed asks for a reason in the same popover. | Human | Linear status popover, S, numbered options |
| 2 | Properties | Severity: low, medium, high | Native select | Popover | Human | Linear priority popover, a new key such as Shift + S |
| 3 | Properties | Source: judge or finder | Not shown | Read-only | none | Plain row with icon |
| 4 | Properties | Judge | Link | Popover to link or change the judge | Human | Linear project popover, Shift + J |
| 5 | Properties | Tags | Not in the schema for issues | Multi-select with create | Human, Agent | Linear label picker, L |
| 6 | Fix | Fix PR | Planned | Link row; agent sets it over MCP, a human may paste one | Agent, Human | Linear link row; hidden until set |
| 7 | Fix | Release | Planned | Read-only in the UI, set by the agent | Agent | Hidden until set, like Linear's due date |
| 8 | Facts | Hits | Shown as Occurrences on the page | Read-only | none | Plain row |
| 9 | Facts | Last seen | Not shown | Read-only, relative time with full time on hover | none | Plain row |
| 10 | Facts | Created by: human or agent | Shown | Read-only | none | Plain row |
| 11 | Facts | Created, Updated | Shown | Read-only | none | Plain row |
| 12 | Relations | Seed trace | Link | Link | none | Linear "Related" rows |
| 13 | Relations | Project | Text | Link | none | Linear project chip |
| 14 | Relations | Recent occurrences | List of trace links | Links, with "Attach evidence" for agents | Agent adds | Linear "Related" group |

#### One order for every object

Every panel uses the same three groups in the same order: editable properties, read-only facts, relations as links. A group with no rows is hidden, the way Linear hides "Related" and the due date.

| Object | Editable properties (who) | Read-only facts | Relations (links) |
|---|---|---|---|
| Issue | See the issue table | See the issue table | See the issue table |
| Trace | Human verdict per judge (Human; popover with Pass, Fail, Defer, keys 1, 2, D), Tags (Human, Agent), Add to dataset (Human) | Start, duration, turns, model and token metrics, judge scores with reasons | Project, Run, Dataset item, Issues that cite it, Judges that scored it |
| Judge | Active version (Human; popover listing versions, activation needs calibration to pass), Description (Human) | State: draft or live, scope, model, TPR and TNR with sample size, labels still needed, disagreements | Project, Versions, Issues it opened, Calibration dataset |
| Judge version | Activate (Human; a button, not a popover), Note (Human, Agent) | Number, parent version, scope, model, params, example count, content hash, created by, created, dev and test calibration | Judge, Parent version, Calibration dataset, Runs that used it |
| Run | Name (Human, Agent) | Started, ended, item count, items hash, pass rate, delta from the previous run, status | Project, Dataset, Previous run, Compare |
| Dataset | Name, Description (Human, Agent), Purpose: eval or judge labels (Human) | Item count, created, last run | Project, Runs, Judges calibrated on it |
| Project | Daily sample size, Daily token budget, Endpoint allowlist, Redaction hook (Human) | Budget used today, traces ingested today, created | Judges, Datasets, Alert rules, Attribute map |

Edit pattern for every editable field: click the row or press its key, a 208px popover opens anchored to the row with a search field and numbered options, the change saves on pick, a line goes into the activity feed, and a toast offers undo. Never reload the page after an edit. Spotter's `panels.ts` calls `location.reload()` today; replace that with an in-place update.

For a field the current token cannot edit, render the row as plain text with no hover pill, and show the reason in the tooltip, such as "Only a person can confirm an issue". Do not hide the field.

Use the issue page's layout, a borderless column, for issue, trace, judge version, and run. Use the project page's card stack for project and judge, where the panel holds several unrelated blocks such as calibration and budget.

## CRUD patterns

### Linear, per feature

#### Issues

| Step | Entry points | Pattern |
|---|---|---|
| Create | C anywhere, the compose button next to the workspace switcher, "+" on a group header, Cmd + K | Modal 750px wide near the top of the window: team chip, "New issue", title, description, property chips (status, priority, assignee, labels, a "…" menu with due date, recurring, link, sub-issue), attach, a "Create more" toggle, and "Create issue" (Cmd + Enter). A toast at the bottom right says "Issue created", names the issue, and links to it. No undo on create. |
| Create sub-issue | "Add sub-issues" under the description, Cmd + Shift + O | Inline composer under the parent. It copies the parent's priority, assignee, and project. Cmd + Enter creates and opens another draft. The parent shows a "Sub-issues 0/1" header with a progress ring. In lists, a sub-issue shows under its parent, and the parent repeats dimmed for context when they sit in different groups. |
| Read | List rows, Space peek, Enter or click to open, the previous and next buttons with an "n / m" counter on the detail page | List rows are 44px. Detail is title, description, sub-issues, activity, comment box, and the right panel. |
| Update, inline | Click a property in the panel or a chip in a list row, or press its key while hovering the row or page | Popover, applies at once, Cmd + Z undoes with a toast |
| Update, title | Click the title, Shift + R | Inline edit |
| Update, bulk | X on each row or Shift + click, then a key or the floating bar | A pill bar at the bottom center, 254 x 44: "2 selected", "Actions" (Cmd + K scoped to the selection), close. Keys S, P, A, L act on every selected row. Undo works on the whole batch: "Undo set status of 2 issues to Done." Selection stays after the change. |
| Update, drag | Board layout (Cmd + B) | Dragging a card to another column changes its status. An overlay on the target column reads "Board ordered by Priority. Hold Cmd to also change priority." No toast. |
| Delete | Cmd + Backspace, the issue "…" menu | Confirm dialog, 480px: "Delete ABC-12?" and a note that deleted issues stay in "Recently deleted" for 30 days. Then a toast with "View recently deleted". Cmd + Z restores, with "Undo delete ABC-12". `#` restores from the archive later. |
| Comment | Click the comment box, Ctrl + M | Enter sends (a preference). The comment becomes a card with a reply field. |
| Relations | M then R, B, X, M | Search picker. A "Related" group appears in the panel. |
| Favorite | Star in the header, Opt + F | The item appears in the sidebar's Favorites. |

#### Projects

| Step | Pattern |
|---|---|
| Create | N then P, or Cmd + K "Create new project…". A larger modal, 920 x 792: icon, name, summary, property chips (status, priority, lead, members, start, target, labels, dependencies), description, milestones, "Create project". A "Create with Agent" button sits in the header. Toast "Project created" with "View project". |
| Read | Projects list, then the project page with Overview, Activity, and Issues tabs, and the card-stack panel |
| Update | Inline chips under the title and the same fields in the panel. Shift + P on an issue adds it to a project. |
| Milestone | "+ Milestone" under the description, or "+" in the Milestones card. Inline name and description fields. |
| Delete | Project "…" menu, Delete. Same confirm dialog and toast as issues, with 30 days in "Recently deleted". |

#### Views

| Step | Pattern |
|---|---|
| Create | Apply a filter on a list (F), then "Save" in the filter bar, or Opt + V. The view is created inline: a dashed "New view" tab appears in the tab row, the header becomes name and description fields, the filter row stays editable, and "Create view" saves it. Toast "View created" with "Open view". |
| Where it appears | As a new tab next to Active, Backlog, and All issues, with a bookmark icon. Not in the sidebar until you favorite it. In this workspace it did not appear on the team or workspace Views pages, which kept their empty state. |
| Update | View "…" menu: Edit, Duplicate, Owner, Subscribe, Slack notifications, Copy link |
| Delete | View "…" menu, Delete, a small confirm dialog with no extra text. No undo toast seen. The favorite disappears a moment later. |

#### Labels

| Step | Pattern |
|---|---|
| Create | From the label picker: type a new name, choose "Create new label", choose the scope (workspace or team), choose a color. Also "New label" in settings. |
| Rename | Settings, team issue labels table: click the name, it turns into a text field, Enter saves. Or "Edit label name" (E) in the row menu. |
| Delete | Row menu: Edit label name, Move to workspace, View labeled issues, Archive, Delete. Delete asks for confirmation, says how many issues lose the label, says "Deletion cannot be undone", and offers Archive as the safer choice. |

#### Favorites

| Step | Pattern |
|---|---|
| Add | Star in the page header or Opt + F on issues, projects, views, and teams |
| Where | A "Favorites" section between Workspace and Your teams. It is hidden while empty. Each item uses the object's own icon: a status icon for an issue, a bookmark for a view. |
| Reorder | Drag. Confirmed. |
| Remove | Hover the item and press its "×", or unstar. Deleting the object removes the favorite. |
| Group | A folder button in the section header on hover |

#### Inbox

| Step | Pattern |
|---|---|
| Triggers | Other people's actions on issues you follow: assignment, mentions, comments, status changes. Your own actions do not create inbox items; assigning yourself showed an "Assigned to you" toast instead. |
| Read | Two panes: a 400px list and the selected item on the right |
| Act | Row context menu or keys: Mark as unread (U), Delete notification (Backspace or E), Snooze (H, with a submenu). Shift + Backspace deletes all read items. Header has a filter, display options, and "Show unreads only". |

#### Command menu

Cmd + K opens a 720px modal near the top of the window. It is scoped: on an issue, a removable chip names the issue and the first options are that issue's actions, each with its key. With rows selected, it acts on the selection. Typing searches actions and objects together, such as "Create new project…", "Go to projects", and "Go to recently deleted projects". Tab switches to "Ask Linear".

#### Filters and display

| Menu | Contents |
|---|---|
| Filter (F) | AI filter, Advanced filter, then one entry per field: Status, Assignee, Agent, Creator, Priority, Labels, Relations, Suggested label, Dates, Project, Project properties, Subscribers, Auto-closed, Content, Links, Template. Typing searches field values directly, such as a label name. |
| Applied filters | A bar under the tabs with one chip per filter, "Labels include X ×", then "+", "Clear", and "Save". Filters stay on that tab until cleared. When rows are hidden: "11 issues hidden by filters" and "Clear Filters". |
| Display (Shift + V) | List or Board, Grouping, Sub-grouping, Ordering, Order completed by recency, Completed issues, Show sub-issues, Nested sub-issues, Show empty groups, and Display properties as toggle chips: ID, Status, Assignee, Creator, Priority, Project, Due date, Milestone, Labels, Links, Time in status, Created, Updated. |

#### Confirmation rule

Linear confirms only deletes, and the delete dialog says how to get the object back. Every other change applies at once and relies on Cmd + Z and the undo toast.

### Port to Spotter

"Today" describes `feat/skeleton`: the API routes and the pages in `app/src`.

| Object | Create | Read | Update | Delete | Undo |
|---|---|---|---|---|---|
| Issue | Copy: C opens a compact modal with title, description, severity chip, judge chip; from a trace, "New issue" pre-fills seed trace and turn. Today: "New issue" form on a trace, `POST /api/issues`, agents over MCP. | Copy: list with Space peek docked, J and K, Enter. Today: list and detail with peek pane. | Copy: panel popovers with keys, bulk bar with S and D, apply at once. Today: status menu and bulk bar exist; severity is a native select; edits reload the page. | Copy: none. An issue is dismissed, never deleted, because dismissal is what stops it coming back. Today: no delete. | Copy: Cmd + Z and an undo toast for status, severity, judge link, and bulk changes. Today: none. |
| Judge | Copy: "Promote to judge" from a confirmed issue, a modal with name, scope, model. Today: CLI and MCP only. | Copy: list, detail with card-stack panel. Today: list and detail. | Copy: description inline; active version through a popover. Today: activate button. | Copy: archive, with a confirm that says which issues it opened. Today: none. | Copy: undo toast for archive. |
| Judge version | Copy: "New version" from the judge page opens an editor seeded from the active version. Today: `judge.propose` over MCP. | Copy: detail with the borderless panel. Today: page exists. | Copy: versions are immutable; only the note changes. | Copy: none. | Copy: undo for activate, as a toast "Activated v3. Undo". |
| Dataset | Copy: modal with name, description, purpose. Today: API and MCP. | Copy: list and detail. Today: both. | Copy: inline name and description. Today: none in UI. | Copy: archive with confirm and item count. Today: none. | Copy: undo toast. |
| Dataset item | Copy: "Add to dataset" (A) from a trace or the review queue; bulk add from a selection. Today: `items/from-traces` API; A in review. | Copy: rows in the dataset page, Space peek. | Copy: inline expected output. | Copy: archive (the column `archived_at` exists), with an undo toast and no dialog. | Copy: Cmd + Z. |
| Run | Copy: created by CI or the CLI only. Today: API. | Copy: list, detail, compare. Today: all three. | Copy: rename only. | Copy: none. | none |
| Trace | Copy: ingest only. Today: OTLP and API. | Copy: list with docked peek, transcript detail with the panel. Today: both. | Copy: verdict popover, tags, add to dataset. Today: "Change verdict" button, review keys 1, 2, D. | Copy: none. | Copy: undo toast on a verdict; review's U already clears a verdict. |
| Label or tag | Copy: create from the tag picker by typing a new name, then a color. No scope step, since tags belong to the project. | Copy: chips in rows and panels. | Copy: rename in project settings, inline. | Copy: delete with a confirm that counts tagged traces and issues. | none after delete, as in Linear |
| Saved view | Copy: apply filters, then "Save" in the filter bar; the view becomes a tab on that list and a row under the project's Views. | Copy: open from the sidebar or the tab. | Copy: view "…" menu, Edit. | Copy: small confirm dialog. | none |
| Inbox item | Created by the system: a new issue to triage, a judge that needs labels, a fix in verify. | Copy: two panes, list and the selected item. Today: Notifications page with Label links. | Copy: snooze (H), mark read (U). | Copy: done or remove (E or Backspace) with no dialog. | Copy: Cmd + Z brings the item back. |

## Sidebar hierarchy

### Linear's tree

| Level | Item | Kind | Label x | Notes |
|---|---|---|---|---|
| 0 | Workspace switcher | Menu button | 43 | 28px, 13px weight 550, avatar at x = 20. Search and compose buttons sit to its right. |
| 1 | Inbox, My issues, Agent | Links | 40 | Icon at x = 20, 14px. No section header. |
| 1 | Workspace | Section header | 21 | 12px weight 500, caret after the label. Collapsible. |
| 2 | Projects, Views, More | Links; More opens a menu with Members, Teams, Customize sidebar | 40 | Same indent as level 1 links. Section children are not indented. |
| 1 | Favorites | Section header | 21 | Hidden while empty. Folder button on hover. |
| 2 | Favorited objects | Links with the object's icon | 40 | Drag to reorder, "×" on hover |
| 1 | Your teams | Section header | 21 | "+" on hover to join or create a team |
| 2 | Team row | Expandable group | 42 | Team icon at x = 21, caret after the name, "…" team menu on hover: Favorite, Team settings, Copy URL, Open archive, Subscribe, Slack notifications, Leave team. Tooltip shows Ctrl + Shift + 1. |
| 3 | Home, Issues, Projects, Views | Links under the team | 57 | Icon at x = 37. 17px deeper than level 2. |
| 1 | Try | Section header | 21 | Onboarding links, each with a dismiss "×" |
| Footer | Help "?" | Button | n/a | Bottom left |

Measured layout:

| Property | Value |
|---|---|
| Row height | 28px |
| Row pitch | 29px (y = 67, 96, 125) |
| Section header to first child | 30px |
| Last child to next section header | 45px, about 16px of space |
| Indent per level | Section children: 0. Team children: 17px for both icon and label. |
| Icon to label gap | 6px |
| Active row | Background `lch(89.54 0.5 282)`, about #E1E1E2, on the full 220px row, radius 8px. Label goes to text primary. |
| Hover row | Background `lch(91.64 0.5 282)`, about #E7E7E8 |
| Collapsed group with an active child | The group row takes the active background, so the active state bubbles up to the nearest visible ancestor. |
| Counts | None shown in this workspace. Linear shows an unread badge on Inbox and lets the user pick the badge style in "Customize sidebar". |
| Section collapse | Click the header. The caret turns. The state is saved per user. |
| Sidebar links remember | The team's Issues link reopens the last tab or view used there. |
| Detail pages | An open issue highlights no sidebar row, unless the issue is a favorite, in which case its favorite row is active. |

### Spotter's tree

The owner fixed this tree. The table says how each Linear rule applies.

| Level | Item | Kind | Indent (label x) | Linear rule applied |
|---|---|---|---|---|
| 0 | "Spotter" workspace switcher | Menu button | 43 | Same as Linear's switcher. Search sits to its right. |
| 1 | Inbox, with a count of items to act on | Link | 40 | Top links have no section header. The count trails the label in text tertiary. |
| 1 | My review queue, with a count of traces waiting for this person's label | Link | 40 | Same |
| 1 | Favorites | Section header | 21 | Hidden while empty. Holds favorited saved views, issues, judges, and traces, each with its own icon. Drag to reorder. |
| 1 | Projects | Section header | 21 | Like "Your teams". "+" on hover creates a project. |
| 2 | One row per project, such as "concierge" | Expandable group | 42 | Like a team row: project icon, caret after the name, "…" menu on hover with Favorite, Project settings, Copy URL. Ctrl + Shift + 1 to 9 jumps to a project. |
| 3 | Issues, Traces, Judges, Runs, Datasets | Links with trailing counts | 57 | 17px deeper than the project row, as in Linear. Counts trail each label as Spotter does today: open issues, traces, live judges, runs, datasets. Each link remembers its last tab, such as Issues on "Dismissed". |
| 3 | Views | Expandable link | 57 | Opens the project's saved views list. Its own children are not shown inline; favorite a view to pin it. |
| Footer | Settings | Link | 40 | At the bottom, above the version line. |

Active state: the active link gets the tinted row. When a project is collapsed, its row takes the active tint. On a detail page, such as an issue, keep the parent list link active (Issues), which is a deliberate change from Linear, because Spotter's PM moves between an issue and its traces often and needs the anchor.

Spotter's 44px icon rail duplicates Inbox, Search, Notifications, and Settings. With this tree, the rail can go; Inbox and Settings live in the tree and search sits by the switcher. If the rail stays, the `[` toggle hides only the 244px tree.

## Top changes by PM value

Smallest first.

1. Add `[` to hide and show the sidebar, with the header toggle button and a saved state. The trace transcript and review queue get the full width on demand.
2. Replace `location.reload()` after panel edits with in-place updates and an undo toast, and bind Cmd + Z. Triage gets faster and a mis-key on status costs nothing.
3. Make the issue panel's severity and judge rows popovers with keys, like status already is, and add the read-only facts PMs ask about: source, hits, last seen. Hide fix PR and release until set.
4. Build one panel component with the shared order (editable, facts, relations) and role-aware rows, and use it on every detail page and in the docked peek on every list.
5. Move to the owner's sidebar tree: personal items, then Favorites, then Projects with per-project Issues, Traces, Judges, Runs, Datasets, and Views, with saved views created from the filter bar.
