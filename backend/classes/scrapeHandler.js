const puppeteer = require("puppeteer");

class ScrapeHandler {
  async startScrape(url, browser) {
    const page = await browser.newPage();
    try {
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
      await page.close();
    }
  }

  async startScrape2(url, browser) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "networkidle2" });

    // Vänta på att produkter renderas
    await page.waitForSelector('[data-testid="product"]', { timeout: 15000 });

    const offers = await page.$$eval('[data-testid="product"]', (cards) => {
      const cleanText = (el) =>
        el ? el.textContent.replace(/\s+/g, " ").trim() : null;

      const attr = (el, name) => (el ? el.getAttribute(name) : null);

      return cards.map((card) => {
        // NAMN (schema.org)
        const name = cleanText(card.querySelector('[itemprop="name"]'));

        // "Brand"/variant-text (i ditt exempel: "NYBERGS DELI Ca 1kg")
        const brand = cleanText(card.querySelector('[itemprop="brand"]'));

        // BILD (schema.org)
        const img = card.querySelector('img[itemprop="image"]');
        const imageUrl = attr(img, "src");

        // LÄNK till produktsidan
        const linkEl = card.querySelector('a[href*="/erbjudanden/"]');
        const href = attr(linkEl, "href");
        const productUrl = href ? href : null; // du kan prefixa med domain i Node om du vill

        // PRIS (schema.org meta itemprop="price" content="105,00")
        const priceMeta = card.querySelector('[itemprop="offers"] [itemprop="price"]');
        const priceRaw = attr(priceMeta, "content"); // ex "105,00"
        const price = priceRaw ? priceRaw.replace(",", ".") : null;

        // PRISENHET (synligt: "/kg" etc)
        const unit = cleanText(card.querySelector('[data-testid^="product-price-"] [class*="jxQDEl"]')) 
          || cleanText(card.querySelector('[data-testid^="product-price-"] [class*="price"]')); 
        // ^ Willys har hashed classnames, så vi tar fallback nedan också

        // Bättre sätt att få enhet: leta efter text som börjar med "/"
        let priceUnit = null;
        const priceArea = card.querySelector('[data-testid^="product-price-"]');
        if (priceArea) {
          const t = priceArea.textContent.replace(/\s+/g, " ").trim();
          const m = t.match(/(\/\s*[a-zA-ZåäöÅÄÖ]+)\b/);
          priceUnit = m ? m[1].replace(/\s+/g, "") : null; // "/kg"
        }

        // SPARA-TEXT (ex "Spara 35,10 kr • Max 3 köp")
        const saveText = cleanText(card.querySelector('[class*="hfSVFg"]')) // din klass i snippet
          || cleanText(card.querySelector('div:has-text("Spara")')); // funkar ej i vanlig DOM, så bara fallback-idé

        // Plocka ut spara-belopp och max köp ur saveText om den finns
        let saveAmount = null;
        let maxQty = null;
        if (saveText) {
          const s = saveText;
          const mSave = s.match(/Spara\s+([\d.,]+)\s*kr/i);
          if (mSave) saveAmount = mSave[1].replace(",", ".");
          const mMax = s.match(/Max\s+(\d+)\s*k[öo]p/i);
          if (mMax) maxQty = Number(mMax[1]);
        }

        return {
          name,
          brand,
          price: price ? Number(price) : null,
          priceUnit,      // ex "/kg"
          saveAmount: saveAmount ? Number(saveAmount) : null,
          maxQty,
          imageUrl,
          productUrl,
        };
      });
    });

    // Filtrera bort tomma
    return offers.filter((o) => o.name || o.brand || o.price || o.imageUrl);
  } finally {
    await page.close();
  }
}

}

module.exports = new ScrapeHandler();
