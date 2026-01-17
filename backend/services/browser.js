const puppeteer = require("puppeteer");

let browserPromise;

async function initBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: "new",
    });
  }
  return browserPromise;
}

async function getBrowser() {
  if (!browserPromise) {
    return initBrowser();
  }
  return browserPromise;
}

async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

module.exports = {
  initBrowser,
  getBrowser,
  closeBrowser,
};
