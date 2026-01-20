const { calcPercentOff, parseSaveAmount, parseMaxQty } = require("./pricing");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

let isFirstRun = true;

async function scrapeWillys(url, browser) {
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "networkidle2" });
    if (isFirstRun) {
      await acceptCookiesIfPresent(page);
      await selectWillysStore(page, "Willys Växjö I11"); // exakt är bäst
      isFirstRun = false;
    }

    await page.waitForSelector('[data-testid="product"]', { timeout: 15000 });
    await autoScroll(page, 10);

    const base = new URL(url).origin;

    const items = await page.$$eval('[data-testid="product"]', (cards, base) => {
      const clean = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);
      const attr = (el, name) => (el ? el.getAttribute(name) : null);

      function parsePriceFromCard(card) {
        function logSometimes(value, chance = 0.1) {
            if (Math.random() < chance) {
                console.log(value);
                }
}               

        // Leta prisytan
        const priceArea = card.querySelector('[data-testid^="product-price-"]');
        if (!priceArea) return { unitPrice: null, unit: null };

        const t = priceArea.textContent.replace(/\s+/g, " ").trim();

        // Ex: "5 för 145" eller "5 för 145 90 /kg"
        // 1) Multi-buy: "X för Y"
        const multi = t.match(/(\d+)\s*för\s*([\d.,]+)/i);
        if (multi) {
        console.log("multi match", multi);
          const qty = Number(multi[1]);
          const total = Number(multi[2].replace(",", "."));
          if (qty > 0 && Number.isFinite(total)) {
            return { unitPrice: Number((total / qty).toFixed(2)), unit: "st" };
          }
        }

        // 2) Per unit: "69 90 /kg" eller "69,90/kg"
        const per = t.match(/([\d.,]+)\s*([0-9]{2})?\s*\/\s*([a-zåäö]+)/i);
        if (per) {
            logSometimes(per, 0.2);
          // fånga typ "69" + "90" eller "69,90"
          let val = per[1].replace(",", ".");
          if (per[2]) val = `${val}.${per[2]}`;
          const unitPrice = Number(val);
          const unit = per[3].toLowerCase();
          return { unitPrice: Number.isFinite(unitPrice) ? Number(unitPrice.toFixed(2)) : null, unit };
        }

        // 3) Single: "39 90" eller "39,90"
        const single = t.match(/([\d.,]+)\s*([0-9]{2})?/);
        if (single) {
            logSometimes(single, 0.2);
          let val = single[1].replace(",", ".");
          if (single[2]) val = `${val}.${single[2]}`;
          const unitPrice = Number(val);
          return { unitPrice: Number.isFinite(unitPrice) ? Number(unitPrice.toFixed(2)) : null, unit: "st" };
        }

        return { unitPrice: null, unit: null };
      }

      return cards.map((card) => {
        const name = clean(card.querySelector('[itemprop="name"]'));
        const brand = clean(card.querySelector('[itemprop="brand"]'));

        const img = card.querySelector('img[itemprop="image"]');
        const imageUrl = attr(img, "src");

        const linkEl = card.querySelector('a[href*="/erbjudanden/"]');
        const href = attr(linkEl, "href");
        const productUrl = href ? (href.startsWith("/") ? base + href : href) : null;

        const saveText =
          clean(card.querySelector('[class*="hfSVFg"]')) ||
          clean(card.querySelector('div[class*="czVckR"]')) ||
          null;

        const { unitPrice, unit } = parsePriceFromCard(card);

        return {
          store: "WILLYS",
          name,
          brand,
          imageUrl,
          productUrl,
          unitPrice,
          unit,
          saveText,
        };
      });
    }, base);

    // Normalisera sista biten i Node (räkna ordPrice etc)
    return items
      .filter((x) => x.name || x.brand || x.unitPrice || x.imageUrl)
      .map((x) => {
        const saveAmount = parseSaveAmount(x.saveText);
        const maxQty = parseMaxQty(x.saveText);

        const ordPrice =
          x.unitPrice != null && saveAmount != null
            ? Number((x.unitPrice + saveAmount).toFixed(2))
            : null;

        const percentOff = calcPercentOff(ordPrice, x.unitPrice);

        return {
          store: x.store,
          name: x.name,
          description: x.brand,
          imageUrl: x.imageUrl,
          productUrl: x.productUrl,

          unitPrice: x.unitPrice,
          unit: x.unit,

          saveAmount,
          maxQty,
          ordPrice,
          percentOff,
        };
      });
  } finally {
    await page.close();
  }
}

async function autoScroll(page, steps = 8) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.2));
    await delay(500);
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






async function autoScrollUntilNoMoreProducts(page, stableRounds = 6) {
  let lastCount = 0;
  let sameCountRounds = 0;

  while (sameCountRounds < stableRounds) {
    const count = await page.$$eval('[data-testid="product"]', els => els.length);

    if (count === lastCount) sameCountRounds++;
    else sameCountRounds = 0;

    lastCount = count;

    // scrolla ned lite (inte bara till botten direkt)
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.2));
    await delay(600); // ge React tid att rendera nästa batch
  }

  // scrolla tillbaka lite upp om listan är virtualiserad (ibland behövs inte)
  // await page.evaluate(() => window.scrollTo(0, 0));
}



module.exports = { scrapeWillys };
