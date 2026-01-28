const delay = (ms) => new Promise((r) => setTimeout(r, ms));

let isFirstRun = true;

const SELECTORS = {
  productCard: '[data-testid="product"]',
  productName: '[itemprop="name"]',
  productBrand: '[itemprop="brand"]',
  productImage: 'img[itemprop="image"]',
  productLink: 'a[href*="/erbjudanden/"]',
  // Willy:s prisregion verkar ha data-testid="product-price-..."
  productPriceArea: '[data-testid^="product-price-"]',
  // meta contentpris (ofta ordinariepris)
  productMetaPrice: '[itemprop="offers"] [itemprop="price"]',
  // OneTrust
  acceptCookiesBtn: "#onetrust-accept-btn-handler",
  // butiksvälj
  storeButtonText: "Välj butik",
  storeSearchInput: 'input[aria-label="Sök efter din butik"]',
  storeListItem: '[data-testid="pickup-location-list-item"]',
};

function normalizeWhitespace(str) {
  return String(str).replace(/\s+/g, " ").trim();
}

function safeTextContent(el) {
  if (!el) return null;
  return normalizeWhitespace(el.textContent || "");
}

function safeAttr(el, name) {
  if (!el) return null;
  return el.getAttribute(name);
}

function normalizePrice(raw) {
  if (!raw) return null;
  const cleaned = String(raw)
    .replace(/\s+/g, "")
    .replace(/[^\d,\.]/g, "");

  if (!cleaned) return null;

  // finns , eller . -> gör till float
  if (/[,.]/.test(cleaned)) {
    const normalized = cleaned.replace(/,/g, ".");
    const num = Number.parseFloat(normalized);
    if (Number.isNaN(num)) return null;
    return num.toFixed(2).replace(".", ",");
  }

  // annars: tolka som ören om längd >= 3
  if (cleaned.length >= 3) {
    const intPart = cleaned.slice(0, -2);
    const decPart = cleaned.slice(-2);
    return `${intPart},${decPart}`;
  }

  return cleaned;
}

function printWillysDebugRows(rows) {
  rows.forEach((r, i) => {
    console.log("________________________________");
    if (r.name=="Oxfilé"){
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
        `multiPrefix="${r.multiPrefix ?? ""}"`,
        `maximumAmount="${r.maximumAmount ?? ""}"`,
        `singlePriceNum="${r.singlePriceNum ?? ""}"`,
        `savePercent="${r.savePercent ?? ""}"`,
        `isKiloPrice="${r.isKiloPrice ?? ""}"`,
      ].join(" | ")
    );
  }
  });

  console.log("\n--- END WILLYS DEBUG ---\n");
}

async function autoScroll(page, steps = 8) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.2));
    await delay(450);
  }
}

async function clickByText(page, selector, textIncludes) {
  const ok = await page.evaluate(
    ({ selector, textIncludes }) => {
      const wanted = textIncludes.toLowerCase();
      const els = Array.from(document.querySelectorAll(selector));
      const el = els.find((e) =>
        (e.textContent || "").replace(/\s+/g, " ").trim().toLowerCase().includes(wanted)
      );
      if (!el) return false;
      el.click();
      return true;
    },
    { selector, textIncludes }
  );

  if (ok) await delay(250);
  return ok;
}

async function acceptCookiesIfPresent(page) {
  // OneTrust
  try {
    const clicked = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      el.click();
      return true;
    }, SELECTORS.acceptCookiesBtn);

    if (clicked) {
      await delay(300);
      return true;
    }
  } catch (_) {
    // ignore
  }

  // fallback: knapp med text
  return await clickByText(page, "button", "Acceptera");
}

async function selectWillysStore(page, storeNameExact) {
  const opened = await clickByText(page, "button", SELECTORS.storeButtonText);
  if (!opened) throw new Error('Kunde inte hitta knappen "Välj butik"');

  await page.waitForSelector(SELECTORS.storeSearchInput, { timeout: 10000 });

  await page.click(SELECTORS.storeSearchInput, { clickCount: 3 });
  await page.type(SELECTORS.storeSearchInput, storeNameExact, { delay: 25 });

  await page.waitForSelector(SELECTORS.storeListItem, { timeout: 10000 });

  const clicked = await page.evaluate(
    ({ wanted, itemSel }) => {
      const w = wanted.toLowerCase();
      const items = Array.from(document.querySelectorAll(itemSel));
      const target = items.find((el) =>
        (el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase().includes(w)
      );
      if (!target) return false;
      target.click();
      return true;
    },
    { wanted: storeNameExact, itemSel: SELECTORS.storeListItem }
  );

  if (!clicked) {
    const options = await page.evaluate((itemSel) => {
      return Array.from(document.querySelectorAll(itemSel))
        .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
        .slice(0, 10);
    }, SELECTORS.storeListItem);

    throw new Error(`Kunde inte välja butik "${storeNameExact}". Förslag: ${options.join(" | ")}`);
  }

  await delay(1200);
}

async function ensureFirstRunSetup(page, storeNameExact) {
  if (!isFirstRun) return;

  console.log("Willys: Accept cookies + select store...");
  await acceptCookiesIfPresent(page);
  await selectWillysStore(page, storeNameExact);

  // scrolla lite så du ser om fler renderas (valfritt)
  await autoScroll(page, 12);

  isFirstRun = false;
}

async function waitForProducts(page) {
  await page.waitForSelector(SELECTORS.productCard, { timeout: 15000 });
  await page.waitForFunction(
    (sel) => document.querySelectorAll(sel).length > 0,
    { timeout: 15000 },
    SELECTORS.productCard
  );
}

async function extractProducts(page) {
  // Hela extractionen ligger i browser-context, så inga node-funktioner här.
  return await page.$$eval(
    SELECTORS.productCard,
    (cards, sel) => {
      const normalizeWhitespace = (str) => String(str).replace(/\s+/g, " ").trim();
      const safeTextContent = (el) => (el ? normalizeWhitespace(el.textContent || "") : null);
      const safeAttr = (el, name) => (el ? el.getAttribute(name) : null);

      const normalizePrice = (raw) => {
        if (!raw) return null;
        const cleaned = String(raw)
          .replace(/\s+/g, "")
          .replace(/[^\d,\.]/g, "");

        if (!cleaned) return null;

        if (/[,.]/.test(cleaned)) {
          const normalized = cleaned.replace(/,/g, ".");
          const num = Number.parseFloat(normalized);
          if (Number.isNaN(num)) return null;
          return num.toFixed(2).replace(".", ",");
        }

        if (cleaned.length >= 3) {
          const intPart = cleaned.slice(0, -2);
          const decPart = cleaned.slice(-2);
          return `${intPart},${decPart}`;
        }

        return cleaned;
      };

      return cards.map((card) => {
        const name = safeTextContent(card.querySelector(sel.productName));
        const brand = safeTextContent(card.querySelector(sel.productBrand));

        const img = card.querySelector(sel.productImage);
        const imageUrl = safeAttr(img, "src");

        const linkEl = card.querySelector(sel.productLink);
        const href = safeAttr(linkEl, "href");

        // Du hade några klass-fallbacks här – jag lämnar dem som-is.
        const saveText =
          safeTextContent(card.querySelector('[class*="hfSVFg"]')) ||
          safeTextContent(card.querySelector('div[class*="czVckR"]')) ||
          null;

        const priceArea = card.querySelector(sel.productPriceArea);
        const priceText = priceArea ? safeTextContent(priceArea) : null;
        const priceRaw = priceArea ? normalizeWhitespace(priceArea.textContent || "") : null;

        const priceMeta = card.querySelector(sel.productMetaPrice);
        const ordPrice = safeAttr(priceMeta, "content"); // ex "105,00"

        let maximumAmount = 0;
        let price = normalizePrice(priceRaw || priceText);
        if (saveText) {
          if (saveText.includes("Max")) {
            const position = saveText.indexOf("Max");
            maximumAmount = Number.parseInt(saveText.slice(position + 4), 10);
            if (Number.isNaN(maximumAmount)) maximumAmount = 0;
          } else {
            maximumAmount = 0;
          }
        }
        // Du hade multiPrefix – den var typ “5 för ...”. Jag lämnar den men utan konstig fallback.
        const multiPrefix = safeTextContent(card.querySelector('[class*="iSfvdv"]')) || null;

        let singlePriceNum = null;
        if (multiPrefix){
          const match = multiPrefix.match(/(\d+)\s*för/);
          if (match){
            const count = parseInt(match[1]);
            if (count > 1 && price){
              singlePriceNum = (parseFloat(price.replace(',', '.')) / count).toFixed(2).replace('.', ',');
            }
            else {
              singlePriceNum = null
            }
          }
        }

        let isKiloPrice = false;
        if (priceRaw && priceRaw.toLowerCase().includes('kg')){
          isKiloPrice = true;
        }

        let savePercent = null;
        if (ordPrice && price) {
          const ordNum = parseFloat(ordPrice.replace(',', '.'));
          let saleNum = null
          if (singlePriceNum != null){
            saleNum = parseFloat(singlePriceNum.replace(',', '.'));
          }
          else {
            saleNum = parseFloat(price.replace(',', '.'));
          }
          if (!Number.isNaN(ordNum) && !Number.isNaN(saleNum) && ordNum > saleNum) {
            savePercent = Math.round(((ordNum - saleNum) / ordNum) * 100);
          }
        }
        return {
          name,
          brand,
          priceText,
          price,
          ordPrice,
          saveText,
          href,
          imageUrl,
          multiPrefix,
          maximumAmount,
          singlePriceNum,
          savePercent,
          isKiloPrice,
        };
      });
    },
    {
      productName: SELECTORS.productName,
      productBrand: SELECTORS.productBrand,
      productImage: SELECTORS.productImage,
      productLink: SELECTORS.productLink,
      productPriceArea: SELECTORS.productPriceArea,
      productMetaPrice: SELECTORS.productMetaPrice,
    }
  );
}

async function scrapeWillys(url, browser) {
  const page = await browser.newPage();
  page.on("console", (msg) => {
  const type = msg.type().toUpperCase();
  console.log(`[BROWSER ${type}]`, msg.text());
  });

  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "networkidle2" });

    await ensureFirstRunSetup(page, "Willys Växjö I11");
    await waitForProducts(page);

    let rows = [];
    try {
      rows = await extractProducts(page);
    } catch (err) {
      console.warn(
        "Willys: failed to extract products, returning empty list.",
        err?.message || err
      );
      rows = [];
    }

    if (!Array.isArray(rows)) {
      console.warn(
        "Willys: product extraction returned non-array, returning empty list.",
        `type=${Object.prototype.toString.call(rows)}`
      );
      rows = [];
    }

    // Printa alla objekt (debug)
    printWillysDebugRows(rows);

    return rows;
  } finally {
    await page.close();
  }
}

module.exports = { scrapeWillys };
