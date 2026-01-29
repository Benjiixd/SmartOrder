"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";

type WillysItem = {
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  href: string | null;

  priceText: string | null;
  price: string | null;
  ordPrice: string | null;
  saveText: string | null;
  multiPrefix: string | null;
  maximumAmount: number | null;
  singlePriceNum: string | null;
  savePercent: number | null;
  isKiloPrice: boolean | null;
};

type ApiResponse = {
  items: WillysItem[];
};

const DEFAULT_URLS = [
  "https://www.willys.se/erbjudanden/butik",
];

async function fetchScrapedItems(urls: string[]): Promise<WillysItem[]> {
  const res = await fetch("http://localhost:5005/scrape/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Backend error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as ApiResponse;
  return Array.isArray(data.items) ? data.items : [];
}

function parseSek(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.replace(",", ".").replace(/[^\d.]/g, "");
  const num = Number.parseFloat(normalized);
  return Number.isNaN(num) ? null : num;
}

function formatSek(value: string | null | undefined) {
  const num = parseSek(value);
  if (num == null) return "—";
  return `${num.toFixed(2).replace(".", ",")} kr`;
}

function formatPct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value}%`;
}

function resolveWillysUrl(href: string | null) {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  if (href.startsWith("/")) return `https://www.willys.se${href}`;
  return `https://www.willys.se/${href}`;
}

export default function HomePage() {
  const [urlsText, setUrlsText] = useState(DEFAULT_URLS.join("\n"));
  const [items, setItems] = useState<WillysItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [sortBy, setSortBy] = useState<
    "priceLowHigh" | "priceHighLow" | "percentOffLowHigh" | "percentOffHighLow"
  >("priceLowHigh");

  const urls = useMemo(() => {
    return urlsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [urlsText]);

  async function runScrape() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchScrapedItems(urls);
      setItems(result);
      console.log("Scraped items:", result);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // auto-run vid första render
    runScrape();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedItems = useMemo(() => {
    if (!Array.isArray(items)) return null;
    const list = [...items];

    const num = (v: string | null | undefined, fallback: number) => {
      const parsed = parseSek(v);
      return parsed == null ? fallback : parsed;
    };
    const pct = (v: number | null | undefined, fallback: number) =>
      v == null || !Number.isFinite(v) ? fallback : v;

    switch (sortBy) {
      case "priceLowHigh":
        list.sort(
          (a, b) =>
            num(a.singlePriceNum ?? a.price, Number.POSITIVE_INFINITY) -
            num(b.singlePriceNum ?? b.price, Number.POSITIVE_INFINITY)
        );
        break;
      case "priceHighLow":
        list.sort(
          (a, b) =>
            num(b.singlePriceNum ?? b.price, Number.NEGATIVE_INFINITY) -
            num(a.singlePriceNum ?? a.price, Number.NEGATIVE_INFINITY)
        );
        break;
      case "percentOffLowHigh":
        list.sort(
          (a, b) => pct(a.savePercent, Number.POSITIVE_INFINITY) - pct(b.savePercent, Number.POSITIVE_INFINITY)
        );
        break;
      case "percentOffHighLow":
        list.sort(
          (a, b) => pct(b.savePercent, Number.NEGATIVE_INFINITY) - pct(a.savePercent, Number.NEGATIVE_INFINITY)
        );
        break;
      default:
        break;
    }

    return list;
  }, [items, sortBy]);

  return (
    <main className="min-h-screen p-8 md:p-12">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">Scraped Offers</h1>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-2">URLs (en per rad)</h2>
            <textarea
              className="w-full h-32 rounded-md border p-3 text-sm"
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              spellCheck={false}
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                className="rounded-md border px-4 py-2 text-sm font-medium"
                onClick={runScrape}
                disabled={isLoading || urls.length === 0}
              >
                {isLoading ? "Scraping..." : "Scrape now"}
              </button>
              <div className="text-sm text-gray-600">
                {urls.length} url(s)
              </div>
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-2">Sortering</h2>
            <label htmlFor="sort" className="text-sm font-medium">
              Sort by
            </label>
            <select
              id="sort"
              className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="priceLowHigh">Pris: låg → hög</option>
              <option value="priceHighLow">Pris: hög → låg</option>
              <option value="percentOffLowHigh">Rabatt: låg → hög</option>
              <option value="percentOffHighLow">Rabatt: hög → låg</option>
            </select>

            <div className="mt-4 text-sm text-gray-600">
              {Array.isArray(sortedItems) ? (
                <span>{sortedItems.length} item(s)</span>
              ) : (
                <span>Loading...</span>
              )}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.isArray(sortedItems) ? (
            sortedItems.map((item, index) => (
              <OfferCard key={`${item.name}-${index}`} item={item} />
            ))
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </div>
    </main>
  );
}

function OfferCard({ item }: { item: WillysItem }) {
  const title = item.name ?? "Unnamed item";

  const priceLabel = formatSek(item.price);
  const singlePriceLabel = item.singlePriceNum ? formatSek(item.singlePriceNum) : "—";
  const productUrl = resolveWillysUrl(item.href);

  return (
    <Card className="p-4 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold leading-snug">{title}</h2>
          <div className="text-sm text-gray-600">Willys</div>
        </div>

        {item.savePercent != null && Number.isFinite(item.savePercent) ? (
          <div className="text-sm font-semibold">
            -{formatPct(item.savePercent)}
          </div>
        ) : (
          <div className="text-sm text-gray-500">—</div>
        )}
      </div>

      {item.imageUrl ? (
        <div className="mt-3 relative w-full aspect-square">
          <Image
            src={item.imageUrl}
            alt={title}
            fill
            className="object-contain rounded-md"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        </div>
      ) : (
        <div className="mt-3 w-full aspect-square rounded-md border flex items-center justify-center text-sm text-gray-500">
          No image
        </div>
      )}

      {item.brand ? (
        <p className="mt-3 text-sm text-gray-700">{item.brand}</p>
      ) : null}

      <div className="mt-3 text-sm text-gray-700 space-y-1">
        <div>
          <span className="font-medium">Pris:</span>{" "}
          <span>{priceLabel}</span>
        </div>
        <div>
          <span className="font-medium">Styckpris:</span>{" "}
          <span>{singlePriceLabel}</span>
        </div>

        <div className="flex gap-4">
          <div>
            <span className="font-medium">Ord:</span> {formatSek(item.ordPrice)}
          </div>
          <div>
            <span className="font-medium">Rabatt:</span> {formatPct(item.savePercent)}
          </div>
        </div>

        <div>
          <span className="font-medium">Max köp:</span>{" "}
          <span>{item.maximumAmount ?? "—"}</span>
        </div>

        {item.multiPrefix ? (
          <div>
            <span className="font-medium">Erbjudande:</span>{" "}
            <span>{item.multiPrefix}</span>
          </div>
        ) : null}

        {item.saveText ? (
          <div>
            <span className="font-medium">Villkor:</span>{" "}
            <span>{item.saveText}</span>
          </div>
        ) : null}

        {item.isKiloPrice ? (
          <div className="text-gray-500">Kilopris</div>
        ) : null}
      </div>

      {productUrl ? (
        <a
          href={productUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 text-sm underline"
        >
          Open product
        </a>
      ) : null}
    </Card>
  );
}
