const { chromium } = require('playwright');

(async () => {
  const targetUrl = process.argv[2] || 'https://ourvidz.lovable.app/workspace?mode=image';
  const waitMs = Number(process.argv[3] || 15000);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const logPrefix = `[${new Date().toISOString()}]`;

  page.on('console', (msg) => {
    try {
      const msgType = msg.type();
      const msgText = msg.text();
      const location = msg.location();
      const locStr = location && location.url ? ` (${location.url}:${location.lineNumber || ''}:${location.columnNumber || ''})` : '';
      console.log(`${logPrefix} console.${msgType}: ${msgText}${locStr}`);
    } catch (err) {
      console.log(`${logPrefix} console: <unserializable message>`);
    }
  });

  page.on('pageerror', (err) => {
    console.error(`${logPrefix} pageerror: ${err && err.stack ? err.stack : err && err.message ? err.message : String(err)}`);
  });

  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      console.warn(`${logPrefix} response ${status}: ${response.url()}`);
    }
  });

  page.on('requestfailed', (request) => {
    const failure = request.failure();
    console.warn(`${logPrefix} requestfailed: ${request.url()} - ${failure ? failure.errorText : 'unknown error'}`);
  });

  try {
    console.log(`${logPrefix} Navigating to ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Try to allow the app to settle and emit logs
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch {}

    // Extra wait to capture late console logs
    await page.waitForTimeout(waitMs);
  } catch (e) {
    console.error(`${logPrefix} navigation_error: ${e && e.stack ? e.stack : e}`);
  } finally {
    await browser.close();
  }
})();