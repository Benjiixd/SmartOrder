const puppeteer = require("puppeteer");

let browserPromise;

async function initBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      //headless: "new",
      headless: false,      // 👈 VIKTIGAST
      slowMo: 50,           // 👈 bromsar varje steg (ms)
      defaultViewport: null // 👈 så du får riktig desktop
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
