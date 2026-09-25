// Compatibility adapter for the existing templates, using maintained Chromium.
let queue = Promise.resolve();
async function render(html, options) {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({
    headless: true,
    ...(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {}),
    args: process.env.PUPPETEER_NO_SANDBOX === 'true' ? ['--no-sandbox'] : [],
  });
  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', req => /^(data:|about:)/.test(req.url()) ? req.continue() : req.abort());
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    const margin = typeof options.border === 'string'
      ? Object.fromEntries(['top','right','bottom','left'].map(k => [k, options.border])) : options.border;
    return Buffer.from(await page.pdf({ format: options.format || 'A4', margin, printBackground: true }));
  } finally { await browser.close(); }
}
exports.create = (html, options = {}) => ({
  toBuffer(callback) {
    const job = queue.then(() => render(html, options));
    queue = job.catch(() => {});
    job.then(buffer => callback(null, buffer), callback);
  },
});
