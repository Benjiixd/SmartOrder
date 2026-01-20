const {
  parseUnitPrice,
  calcPercentOff,
  parseSaveAmount,
  parseMaxQty,
  parseSwedishNumber,
} = require("./pricing");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let isFirstRun = true;

async function scrapeWillys(url, browser) {
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "networkidle2" });

    // gå til en butik
    if (isFirstRun) {
      console.log("Willys: Accepting cookies and selecting store");
      await acceptCookiesIfPresent(page);
      await selectWillysStore(page, "Växjö"); // kan vara exakt butiksnamn senare
      isFirstRun = false;
    }
    



    await page.waitForSelector('[data-testid="product"]', { timeout: 15000 });

    const raw = await page.$$eval('[data-testid="product"]', (cards) => {
      const cleanText = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);
      const attr = (el, name) => (el ? el.getAttribute(name) : null);

      return cards.map((card) => {
        const name = cleanText(card.querySelector('[itemprop="name"]'));
        const brand = cleanText(card.querySelector('[itemprop="brand"]'));

        const img = card.querySelector('img[itemprop="image"]');
        const imageUrl = attr(img, "src");

        const linkEl = card.querySelector('a[href*="/erbjudanden/"]');
        const href = attr(linkEl, "href");

        // Spara/max text (den du visade)
        const saveText =
          cleanText(card.querySelector('[class*="hfSVFg"]')) ||
          cleanText(card.querySelector('div[class*="czVckR"]')) ||
          null;

        // Försök få "priceText" från synliga prisytan (ibland är meta price bara en siffra)
        const priceArea = card.querySelector('[data-testid^="product-price-"]');
        const priceText = priceArea ? cleanText(priceArea) : null;

        // Meta price (schema.org) ifall du vill ha “numeriskt pris”
        const priceMeta = card.querySelector('[itemprop="offers"] [itemprop="price"]');
        const priceRaw = attr(priceMeta, "content"); // ex "105,00"

        return {
          name,
          brand,
          imageUrl,
          href,
          saveText,
          priceText,
          priceRaw,
        };
      });
    });

    const base = new URL(url).origin;

    const items = raw
      .filter((o) => o.name || o.brand || o.priceText || o.imageUrl)
      .map((o) => {
        const productUrl = o.href ? (o.href.startsWith("/") ? base + o.href : o.href) : null;

        // Vilken "priceText" ska vi använda för parsing?
        // - primärt: synliga texten
        // - fallback: meta priceRaw -> "105,00 kr"
        const effectivePriceText =
          o.priceText ||
          (o.priceRaw ? `${String(o.priceRaw).replace(",", ":")} kr` : null);

        const { unitPrice, unit } = parseUnitPrice(effectivePriceText);

        // Willys har ofta "Spara X kr", så vi kan räkna ordPrice = unitPrice + saveAmount (om unitPrice är "nu-pris")
        const saveAmount = parseSaveAmount(o.saveText);
        const ordPrice = (unitPrice != null && saveAmount != null)
          ? Number((unitPrice + saveAmount).toFixed(2))
          : null;

        const percentOff = calcPercentOff(ordPrice, unitPrice);

        return {
          store: "WILLYS",
          name: o.name,
          description: o.brand,
          imageUrl: o.imageUrl,
          productUrl,
          priceText: effectivePriceText,
          unitPrice,
          unit,
          ordPrice,
          percentOff,
          saveAmount: saveAmount != null ? Number(saveAmount.toFixed(2)) : null,
          maxQty: parseMaxQty(o.saveText),
        };
      });

    // (bara för att undvika eslint gnäll om du har det)
    void parseSwedishNumber;

    return items;
  } finally {
    console.log("Closing Willys page");
    await page.close();
  }
}

async function acceptCookiesIfPresent(page) {
  // OneTrust
  const sel = "#onetrust-accept-btn-handler";

  try {
    const btn = await page.$(sel);
    if (btn) {
      await btn.click();
      await delay(300);
      return true;
    }
  } catch (_) {}

  // fallback: klicka knapp som innehåller "Acceptera"
  return await clickByText(page, "button", "Acceptera");
}

async function selectWillysStore(page, storeNameExact) {
  // 1) Klicka "Välj butik"
  // (din knapp är <button ...>Välj butik</button>)
  const opened = await clickByText(page, "button", "Välj butik");
  if (!opened) throw new Error('Kunde inte hitta knappen "Välj butik"');

  // 2) Vänta på sökfältet
  const searchSel = 'input[aria-label="Sök efter din butik"]';
  await page.waitForSelector(searchSel, { timeout: 10000 });

  // 3) Skriv in exakt butik
  await page.click(searchSel, { clickCount: 3 });
  await page.type(searchSel, storeNameExact, { delay: 30 });

  // 4) Vänta på lista och klicka rätt butik (matcha text)
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
    // debug: hämta topp 10 matchningar så du ser vad DOM:en innehåller
    const options = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-testid="pickup-location-list-item"]'))
        .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
        .slice(0, 10)
    );
    throw new Error(`Kunde inte välja butik "${storeNameExact}". Förslag: ${options.join(" | ")}`);
  }

  // 5) Vänta tills modal stänger / produkter uppdateras
  await delay(1200);
}

// Hjälpfunktion: klicka element av en viss typ som innehåller text
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

  if (ok) await delay(300);
  return ok;
}





module.exports = { scrapeWillys };
