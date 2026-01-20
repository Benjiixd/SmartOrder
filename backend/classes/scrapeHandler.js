const { detectStore } = require("../scrapers");
const { scrapeIca } = require("../scrapers/utils/ica");
const { scrapeWillys } = require("../scrapers/utils/willys");

class ScrapeHandler {
  /**
   * Scrapa flera URLs (sequentialt)
   */
  async scrapeMany(urls, browser) {
    const results = [];

    for (const url of urls) {
      const store = detectStore(url);

      let items = [];
      console.log(`Scraping ${store} - ${url}`);
      if (store === "ICA") items = await scrapeIca(url, browser);
      else if (store === "WILLYS") items = await scrapeWillys(url, browser);
      else items = [];

      results.push(...items);
    }

    return results;
  }
}

module.exports = new ScrapeHandler();
