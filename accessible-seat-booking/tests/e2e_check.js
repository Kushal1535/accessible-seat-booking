const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type()==='error' && errs.push(m.text()));
  await page.goto('file://' + path.resolve('after/index.html'));
  const out = {};
  out.seats = await page.locator('#seat-grid button').count();
  out.tabStops = await page.locator('#seat-grid button[tabindex="0"]').count();
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); // skip link, then first seat
  out.focusedFirst = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  out.afterRight = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  await page.keyboard.press('ArrowRight'); // A4 unavailable
  out.onUnavailable = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  await page.keyboard.press('Space'); // should not select
  out.statusAfterUnavail = await page.locator('#status').innerText();
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); // C4
  await page.keyboard.press('Space');
  out.statusAfterSelect = await page.locator('#status').innerText();
  out.pressed = await page.evaluate(() => document.activeElement.getAttribute('aria-pressed') + ' | ' + document.activeElement.getAttribute('aria-label'));
  // submit empty name/email -> error summary gets focus
  await page.click('button.primary');
  out.focusAfterError = await page.evaluate(() => document.activeElement.id);
  out.summaryVisible = await page.locator('#error-summary').isVisible();
  out.errors = await page.locator('#error-list li').allInnerTexts();
  out.nameInvalid = await page.getAttribute('#name', 'aria-invalid');
  out.nameDescribed = await page.getAttribute('#name', 'aria-describedby');
  await page.fill('#name', 'Kushal'); await page.fill('#email', 'kushal@example.com');
  await page.click('button.primary');
  out.focusAfterOk = await page.evaluate(() => document.activeElement.id);
  out.confirmation = await page.locator('#confirmation-text').innerText();
  out.formHidden = !(await page.locator('#booking-form').isVisible());
  out.errs = errs;
  // mobile reflow check at 320px: no horizontal scroll
  await page.setViewportSize({ width: 320, height: 640 }); await page.reload();
  out.hScroll320 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  // min seat target size
  const box = await page.locator('#seat-grid button').first().boundingBox();
  out.seatSize = Math.round(box.width) + 'x' + Math.round(box.height);
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch(e => { console.error('E2E_FAIL', e.message.split('\n')[0]); process.exit(1); });
