const puppeteer = require("puppeteer");

class ScrapeHandler {
  async startScrape(url) {
    const browser = await puppeteer.launch({
      headless: "new",
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      await page.goto(url, { waitUntil: "networkidle2" });

      // Vänta tills minst ett kort finns
      await page.waitForSelector("article.offer-card", { timeout: 15000 });

      const offers = await page.$$eval("article.offer-card", (articles) => {
        const cleanText = (el) =>
          el ? el.textContent.replace(/\s+/g, " ").trim() : null;

        return articles.map((article) => {
          // NAMN
          const name = cleanText(
            article.querySelector("p.offer-card__title")
          );

          // TEXT / BESKRIVNING
          const text = cleanText(
            article.querySelector("p.offer-card__text")
          );

          // BILD
          const img = article.querySelector("img.offer-card__image-inner");
          const imageUrl = img ? img.getAttribute("src") : null;

          // PRIS
          let price = cleanText(
            article.querySelector(".price-splash .sr-only")
          );

          // Fallback om sr-only saknas
          if (!price) {
            const prefix = cleanText(
              article.querySelector(".price-splash__text__prefix")
            );
            const value = cleanText(
              article.querySelector(".price-splash__text__firstValue")
            );

            if (prefix && value) {
              price = `${prefix} ${value}`;
            } else if (value) {
              price = value;
            }
          }

          return {
            name,
            text,
            price,
            imageUrl,
          };
        });
      });

      // Ta bort helt tomma entries
      return offers.filter(
        (o) => o.name || o.text || o.price || o.imageUrl
      );
    } finally {
      await browser.close();
    }
  }
}

module.exports = new ScrapeHandler();