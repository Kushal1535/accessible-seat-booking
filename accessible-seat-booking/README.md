# accessible-seat-booking

A small before/after study of web accessibility. `before/` is a seat-booking page with common
WCAG failures; `after/` is the same idea rebuilt with semantic HTML, ARIA, keyboard support and
accessible form validation, targeting WCAG 2.2 level AA. Plain HTML, CSS and JavaScript, no build step.

- `after/` the accessible page (open `after/index.html`), behaviour in `after/app.js`
- `before/` the deliberately inaccessible page
- `docs/AUDIT.md` 15 findings mapped to WCAG 2.2 success criteria, with fixes and results
- `tools/a11y_lint.py` static checker: lang, title, alt text, labels, control names, focus outline, heading order,
  duplicate ids, positive tabindex, click handlers without keyboard access, WCAG contrast ratios
- `tests/test_logic.js` unit tests (Node), `tests/e2e_check.js` keyboard/form walkthrough (Playwright)

```bash
python3 tools/a11y_lint.py before/index.html after/index.html
python3 tools/a11y_lint.py --palette before/palette.json
python3 tools/a11y_lint.py --palette after/palette.json
node tests/test_logic.js
node tests/e2e_check.js        # needs Playwright + Chromium
```
The checker automates only part of WCAG. It does not replace screen-reader testing or tools such as axe.
