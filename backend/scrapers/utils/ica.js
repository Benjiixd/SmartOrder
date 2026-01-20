const {
  parseUnitPrice,
  extractOrdPrice,
  calcPercentOff,
  parseSaveAmount,
  parseMaxQty,
} = require("./pricing");

async function scrapeIca(url, browser) {
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "networkidle2" });

    await page.waitForSelector("article.offer-card", { timeout: 15000 });

    const raw = await page.$$eval("article.offer-card", (articles) => {
      const cleanText = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);

      return articles.map((article) => {
        const name = cleanText(article.querySelector("p.offer-card__title"));
        const description = cleanText(article.querySelector("p.offer-card__text"));

        const img = article.querySelector("img.offer-card__image-inner");
        const imageUrl = img ? img.getAttribute("src") : null;

        let priceText = cleanText(article.querySelector(".price-splash .sr-only"));

        // fallback
        if (!priceText) {
          const prefix = cleanText(article.querySelector(".price-splash__text__prefix"));
          const value = cleanText(article.querySelector(".price-splash__text__firstValue"));
          if (prefix && value) priceText = `${prefix} ${value}`;
          else if (value) priceText = value;
        }

        return { name, description, priceText, imageUrl };
      });
    });

    const base = new URL(url).origin;

    const items = raw
      .filter((o) => o.name || o.description || o.priceText || o.imageUrl)
      .map((o) => {
        const ordPrice = extractOrdPrice(o.description);
        const { unitPrice, unit } = parseUnitPrice(o.priceText);
        const percentOff = calcPercentOff(ordPrice, unitPrice);

        return {
          store: "ICA",
          name: o.name,
          description: o.description,
          imageUrl: o.imageUrl,
          productUrl: null, // ICA-korten i ditt snippet hade ingen enkel produktlänk, kan läggas till senare
          priceText: o.priceText,
          unitPrice,
          unit,
          ordPrice,
          percentOff,
          saveAmount: parseSaveAmount(o.description),
          maxQty: parseMaxQty(o.description),
        };
      });

    // base används inte just nu för ICA, men kvar om du vill bygga full länk senare
    void base;

    return items;
  } finally {
    console.log("Closing ICA page");
    await page.close();
  }
}

module.exports = { scrapeIca };
