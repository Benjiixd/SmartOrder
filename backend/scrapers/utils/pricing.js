function parseSwedishNumber(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, "").replace(",", ".").replace(":", "."));
  return Number.isFinite(n) ? n : null;
}

function parseUnitPrice(priceText) {
  if (!priceText) return { unitPrice: null, unit: null };

  const t = String(priceText).replace(/\s+/g, " ").trim();

  // "5 för 145 kr"
  const multi = t.match(/(\d+)\s*för\s*([\d:.,]+)\s*kr/i);
  if (multi) {
    const qty = Number(multi[1]);
    const total = parseSwedishNumber(multi[2]);
    if (qty > 0 && Number.isFinite(total)) {
      return { unitPrice: Number((total / qty).toFixed(2)), unit: "st" };
    }
  }

  // "69:90/kg" eller "69,90 /kg"
  const per = t.match(/([\d:.,]+)\s*kr?\s*\/\s*([a-zåäö]+)/i);
  if (per) {
    const val = parseSwedishNumber(per[1]);
    const unit = per[2].toLowerCase();
    return { unitPrice: val != null ? Number(val.toFixed(2)) : null, unit };
  }

  // "41:90 kr"
  const single = t.match(/([\d:.,]+)\s*kr/i);
  if (single) {
    const val = parseSwedishNumber(single[1]);
    return { unitPrice: val != null ? Number(val.toFixed(2)) : null, unit: "st" };
  }

  return { unitPrice: null, unit: null };
}

function extractOrdPrice(text) {
  if (!text) return null;

  // "Ord.pris 41:90 kr"
  let m = String(text).match(/Ord\.pris\s+([\d:.,]+)\s*kr/i);
  if (m) return parseSwedishNumber(m[1]);

  // "Ord pris 41:90 kr"
  m = String(text).match(/Ord\s*pris\s+([\d:.,]+)\s*kr/i);
  if (m) return parseSwedishNumber(m[1]);

  return null;
}

function calcPercentOff(ordPrice, unitPrice) {
  if (!Number.isFinite(ordPrice) || !Number.isFinite(unitPrice) || ordPrice <= 0) return null;
  const pct = ((ordPrice - unitPrice) / ordPrice) * 100;
  return Number.isFinite(pct) ? Number(pct.toFixed(2)) : null;
}

function parseSaveAmount(text) {
  if (!text) return null;
  const m = String(text).match(/Spara\s+([\d:.,]+)\s*kr/i);
  if (!m) return null;
  return parseSwedishNumber(m[1]);
}

function parseMaxQty(text) {
  if (!text) return null;
  const m = String(text).match(/Max\s+(\d+)\s*k[öo]p/i);
  if (!m) return null;
  return Number(m[1]);
}

module.exports = {
  parseSwedishNumber,
  parseUnitPrice,
  extractOrdPrice,
  calcPercentOff,
  parseSaveAmount,
  parseMaxQty,
};