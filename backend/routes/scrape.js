express = require('express');
const router = express.Router();

const scrapeHandler = require('../classes/scrapeHandler');
const { getBrowser } = require('../services/browser');

router.post('/start', async (req, res) => {
    try {
        const { url } = req.body;
        const browser = await getBrowser();
        const scrapeId = await scrapeHandler.startScrape(url, browser);
        res.status(202).json({ message: 'Scrape started', scrapeId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
