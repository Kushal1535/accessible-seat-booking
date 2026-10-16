# Accessibility audit: seat-booking page (before vs after)

Scope: one page with a seat picker and a booking form. Standard: WCAG 2.2, level A and AA.
Method: `tools/a11y_lint.py` (static markup + contrast ratios), unit tests for the behaviour
logic, and a scripted keyboard/form walkthrough in headless Chromium (`tests/e2e_check.js`).
Manual screen-reader testing (NVDA, VoiceOver) is listed under "Still to verify manually".

| # | Issue in `before/` | WCAG 2.2 SC | Fix in `after/` |
|---|--------------------|-------------|-----------------|
| 1 | No `lang` on `<html>` | 3.1.1 Language of Page (A) | `<html lang="en">` |
| 2 | Empty `<title>` | 2.4.2 Page Titled (A) | Descriptive title |
| 3 | Image without `alt` | 1.1.1 Non-text Content (A) | Decorative content removed; icons marked `aria-hidden` and named by their button label |
| 4 | Seats are `<div onclick>`: no keyboard, no role | 2.1.1 Keyboard (A), 4.1.2 Name, Role, Value (A) | Native `<button>` per seat, `aria-pressed`, descriptive `aria-label` ("Row C, seat 4, selected") |
| 5 | Seat status shown by colour only (green / red / blue) | 1.4.1 Use of Color (A) | Tick mark for selected, hatch pattern for unavailable, legend, state also in the accessible name |
| 6 | Inputs labelled by plain text, not programmatically | 1.3.1 Info and Relationships (A), 3.3.2 Labels or Instructions (A) | `<label for>`, `autocomplete`, correct `type="email"` |
| 7 | Focus outline removed (`outline: none`) | 2.4.7 Focus Visible (AA) | 3px `:focus-visible` ring with white halo |
| 8 | `tabindex="5"` | 2.4.3 Focus Order (A) | Natural DOM order; roving `tabindex` in the seat grid (one tab stop, arrow keys inside) |
| 9 | Low-contrast text: #aaa on white (2.32:1), white on #7fb0ff (2.20:1), #ff9999 error (2.05:1) | 1.4.3 Contrast (Minimum) (AA) | All text pairs at 7.0:1 or better, checked in `after/palette.json` |
| 10 | Seat/input boundaries below 3:1 | 1.4.11 Non-text Contrast (AA) | 5.33:1 borders |
| 11 | Heading jumps h1 to h4; page title is a styled `<div>`; no `<main>` | 1.3.1 (A), 2.4.6 Headings and Labels (AA) | Single `<h1>`, h2 sections, `<main>` landmark |
| 12 | No way to bypass repeated content | 2.4.1 Bypass Blocks (A) | Skip link, visible on focus |
| 13 | Duplicate `id="seat"`; invalid markup | 1.3.1 (4.1.1 was removed in WCAG 2.2) | Unique ids |
| 14 | Error is "Error!" in pale red, not tied to a field, not announced | 3.3.1 Error Identification (A), 3.3.3 Error Suggestion (AA), 4.1.3 Status Messages (AA) | Error summary with links to fields (focus moves to it), inline messages, `aria-invalid`, `aria-describedby`, `role="status"` live region for selection changes |
| 15 | Small click targets (20px) | 2.5.8 Target Size (Minimum) (AA, new in 2.2) | 44px seats |

Results
- `a11y_lint.py`: before = 13 errors, 2 warnings; after = 0 errors, 0 warnings.
- Contrast: before = 4 of 5 pairs fail; after = 12 of 12 pass.
- Headless Chromium walkthrough on `after/`: one tab stop in the grid, arrow keys move focus, unavailable seats
  cannot be selected, selection updates the status text, invalid submit moves focus to the error summary and sets
  `aria-invalid`/`aria-describedby`, valid submit moves focus to the confirmation, no horizontal scroll at 320px.

Still to verify manually (a static checker cannot do these)
- Screen reader pass with NVDA + Firefox/Chrome and VoiceOver + Safari: are labels, states and status messages read sensibly?
- axe DevTools or Lighthouse accessibility run in the browser.
- 200% zoom / text-spacing override, Windows High Contrast / forced-colors mode.
