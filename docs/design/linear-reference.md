# Linear UI measurements

Spotter's layout borrows from Linear. This page records Linear's rendered values so Spotter can match them exactly. Values come from computed styles in Linear's web app on 2026-10-05, at a 1481 x 1172 viewport, in the light and dark system themes. Colors are converted from Linear's LCH values to hex.

These are measurements, not Linear's source. Spotter does not copy Linear's icon artwork. It matches the icon size and weight with its own open-source icons.

## Type

Linear uses Inter Variable with weights between 450 and 600.

| Use | Size | Weight | Line height | Color role |
|---|---|---|---|---|
| Page or issue title | 24px | 600 | 1.6, letter-spacing -0.1px | text primary |
| Dialog title | 18px | 600 | 1.6 | text primary |
| Section heading, such as "Activity" | 15px | 600 | 23px | text primary |
| Long text: description, comment | 15px | 450 | 1.5 to 1.6 | text secondary |
| UI text: sidebar items, list titles, properties, menus | 13px | 500 (titles, nav), 400 (menu items) | 16px in rows, 19.5px in menus | primary, secondary, or tertiary |
| Ids and counts | 13px | 450 | 16px | text tertiary |
| Meta: dates, tabs, buttons, chips, sidebar section labels | 12px | 450 (dates), 500 (controls) | 15px | text tertiary |

## Sizes

| Element | Height | Padding | Radius | Other |
|---|---|---|---|---|
| Sidebar | n/a | items inset to 220px wide | n/a | Width 244px. It has no border and sits on the page canvas. |
| Sidebar item | 28px | 0 9px 0 8px | 8px | Icon to label gap 6px. The active item gets a tinted background. |
| Sidebar section label | 28px | 0 4px | 8px | 12px, weight 500 |
| Workspace switcher | 28px | 0 9px 0 5px | 10px | 13px, weight 550 |
| Main panel | full height | none | 12px | Inset 8px from the top, right, and bottom. 1px border-primary border, panel background, subtle shadow. |
| Header bar | about 44px | breadcrumb at 13px, weight 500 | none | Its buttons are 28px circles. |
| View tabs | 28px | 0 10px | pill | 12px, weight 500, 1px transparent border. Active: secondary background. Idle: white. |
| Icon button | 28 x 28px | 0 2px | pill | White background. Grouped buttons join with half-pill radii. |
| Group header row | 36px | 0 8px 0 0 | 8px | Quaternary background, 13px weight 500, count at 13px weight 450 |
| List row | 44px | content row 36px | none | Gaps of 8px between id, status, and title |
| Property button | 28px | 0 10px 0 6px | pill | 13px weight 500, icon gap 6px |
| Property group label | 20px | 0 8px | none | 13px weight 500, text tertiary |
| Right properties panel | n/a | top 51px | none | 386px wide, groups 10px apart |
| Small chip | 24px | 0 8px 0 6px or 0 12px 0 6px | pill | 12px weight 500 |
| Primary button | 28px | 0 10px | pill | 12px weight 500, accent background, subtle shadow |
| Popover menu | n/a | n/a | 12px | 208px wide, white, 1px border, layered shadow |
| Menu item | 32px | 0 18px 0 14px | none | 13px weight 400, line height 19.5px |
| Menu search input | 36px | 10px 0 9px | none | 13px |

## Borders and shadows

| Use | Value |
|---|---|
| Main panel border | 1px border-primary |
| Popover border | 1px #E4E4E4 light |
| Focus ring | 1px |
| Panel and button shadow | `0 3px 6px -2px rgb(0 0 0 / 2%), 0 1px 1px rgb(0 0 0 / 4%)` |
| Popover shadow | `0 6px 18px rgb(0 0 0 / 2%), 0 3px 9px rgb(0 0 0 / 4%), 0 1px 1px rgb(0 0 0 / 4%)` |

## Color roles

| Role | Light | Dark |
|---|---|---|
| Page canvas | #EFEFF0 | #09090A |
| Panel | #F9F9FA | #121213 |
| Background secondary | #E9E9EA | #161617 |
| Background tertiary | #E5E5E6 | #17181A |
| Background quaternary | #EFEFF0 | #1A1A1B |
| Control and popover | #FFFFFF | n/a |
| Border primary | #F1F1F1 | #1A1B1D |
| Border secondary | #DEDEDE | #232426 |
| Border tertiary | #D3D3D3 | #28282B |
| Text primary | #1B1B1B | #FFFFFF |
| Text secondary | #2F2F31 | #E3E4E6 |
| Text tertiary | #5C5C5E | #959597 |
| Text quaternary | #9C9D9F | #565759 |

## Icons

| Use | Rendered size | Grid | Style | Color |
|---|---|---|---|---|
| Sidebar and menu | 14px | 16 or 14 | Filled glyph | Same as the label, tertiary or sidebar text |
| Properties and status | 16px | 16 | Filled glyph | Text quaternary for empty states |
| Status circle in rows | 14px drawn, 18px box | 16 | Outline circle | Text quaternary |
