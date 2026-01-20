const express = require("express");
const router = express.Router();

const scrapeHandler = require("../classes/scrapeHandler");
const { getBrowser } = require("../services/browser");

router.post("/start", async (req, res) => {
  try {
    const { url, urls } = req.body;

    const list = Array.isArray(urls)
      ? urls
      : (typeof url === "string" && url.trim() ? [url.trim()] : []);

    if (list.length === 0) {
      return res.status(400).json({ error: "Provide url (string) or urls (string[])" });
    }

    const browser = await getBrowser();
    const items = await scrapeHandler.scrapeMany(list, browser);

    res.status(200).json({ items });
  } catch (error) {
    console.error("Scrape error:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

module.exports = router;