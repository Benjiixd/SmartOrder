const delay = (ms) => new Promise((r) => setTimeout(r, ms));

let isFirstRun = true;

async function scrapeWillys(url, browser) {
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "networkidle2" });

    if (isFirstRun) {
      console.log("Willys: Accept cookies + select store...");
      await acceptCookiesIfPresent(page);
      await selectWillysStore(page, "Willys Växjö I11");
      isFirstRun = false;
    }

    await page.waitForSelector('[data-testid="product"]', { timeout: 15000 });

    // scrolla lite så du ser om fler renderas (valfritt)
    await autoScroll(page, 12);

    // plocka ut “råa” värden från DOM och returnera dem
    const rows = await page.$$eval('[data-testid="product"]', (cards) => {
      const clean = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);
      const attr = (el, name) => (el ? el.getAttribute(name) : null);

      return cards.map((card) => {
        const name = clean(card.querySelector('[itemprop="name"]'));
        const brand = clean(card.querySelector('[itemprop="brand"]'));

        const img = card.querySelector('img[itemprop="image"]');
        const imageUrl = attr(img, "src");

        const linkEl = card.querySelector('a[href*="/erbjudanden/"]');
        const href = attr(linkEl, "href");

        const saveText =
          clean(card.querySelector('[class*="hfSVFg"]')) ||
          clean(card.querySelector('div[class*="czVckR"]')) ||
          null;

        const priceArea = card.querySelector('[data-testid^="product-price-"]');
        const priceText = priceArea ? clean(priceArea) : null;
        const price = priceArea ? priceArea.textContent.replace(/\s+/g, " ").trim() : null;

        const priceMeta = card.querySelector('[itemprop="offers"] [itemprop="price"]');
        const ordPrice = attr(priceMeta, "content"); // ex "105,00"

        const multiPrefix =
          clean(card.querySelector('[class*="iSfvdv"]')) || // din "5 för" kan hamna här ibland
          clean(card.querySelector('div:where(*)')) || null; // ignoreras ofta, men lämnar minimal fallback

        return {
          name,
          brand,
          priceText,
          price,
          ordPrice,
          saveText,
          href,
          imageUrl,
          priceMeta
        };
      });
    });

    // PRINTA RAD FÖR RAD I NODE
    console.log(`\n--- WILLYS DEBUG: ${rows.length} produkter i DOM ---\n`);

    rows.forEach((r, i) => {
    console.log("________________________________");
      console.log(
        [
          `#${String(i + 1).padStart(3, "0")}`,
          `name="${r.name ?? ""}"`,
          `brand="${r.brand ?? ""}"`,
          `priceText="${r.priceText ?? ""}"`,
          `ordPrice="${r.ordPrice ?? ""}"`,
          `Price="${r.price ?? ""}"`,
          `saveText="${r.saveText ?? ""}"`,
          `href="${r.href ?? ""}"`,
          `imageUrl="${r.imageUrl ?? ""}"`,
          `priceMeta="${r.priceMeta ?? ""}"`,
        ].join(" | ")
      );
    });

    console.log("\n--- END WILLYS DEBUG ---\n");

    // returnera också om du vill se i frontend/logik senare
    return rows;
  } finally {
    await page.close();
  }
}

async function autoScroll(page, steps = 8) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.2));
    await delay(450);
  }
}

async function acceptCookiesIfPresent(page) {
  // OneTrust-knappen du visade
  const sel = "#onetrust-accept-btn-handler";
  try {
    const clicked = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      el.click();
      return true;
    }, sel);
    if (clicked) {
      await delay(300);
      return true;
    }
  } catch (_) {}

  // fallback: klicka knapp som innehåller “Acceptera”
  return await clickByText(page, "button", "Acceptera");
}

async function selectWillysStore(page, storeNameExact) {
  // Klicka "Välj butik"
  const opened = await clickByText(page, "button", "Välj butik");
  if (!opened) throw new Error('Kunde inte hitta knappen "Välj butik"');

  // Sökfält
  const searchSel = 'input[aria-label="Sök efter din butik"]';
  await page.waitForSelector(searchSel, { timeout: 10000 });

  await page.click(searchSel, { clickCount: 3 });
  await page.type(searchSel, storeNameExact, { delay: 25 });

  await page.waitForSelector('[data-testid="pickup-location-list-item"]', { timeout: 10000 });

  const clicked = await page.evaluate((wanted) => {
    const items = Array.from(document.querySelectorAll('[data-testid="pickup-location-list-item"]'));
    const target = items.find((el) =>
      (el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase().includes(wanted.toLowerCase())
    );
    if (target) {
      target.click();
      return true;
    }
    return false;
  }, storeNameExact);

  if (!clicked) {
    const options = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-testid="pickup-location-list-item"]'))
        .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
        .slice(0, 10)
    );
    throw new Error(`Kunde inte välja butik "${storeNameExact}". Förslag: ${options.join(" | ")}`);
  }

  await delay(1200);
}

async function clickByText(page, selector, textIncludes) {
  const ok = await page.evaluate(
    ({ selector, textIncludes }) => {
      const els = Array.from(document.querySelectorAll(selector));
      const el = els.find((e) =>
        (e.textContent || "").replace(/\s+/g, " ").trim().toLowerCase().includes(textIncludes.toLowerCase())
      );
      if (el) {
        el.click();
        return true;
      }
      return false;
    },
    { selector, textIncludes }
  );

  if (ok) await delay(250);
  return ok;
}

module.exports = { scrapeWillys };
