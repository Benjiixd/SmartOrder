"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";

type ScrapedItem = {
  store: string; // "ICA" | "WILLYS" | ...
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  productUrl: string | null;

  priceText: string | null;   // råtext
  unitPrice: number | null;   // normaliserat pris per st/kg/l etc (beroende på unit)
  unit: string | null;        // "st" | "kg" | "l" | ...

  ordPrice: number | null;
  price: number | null;
  percentOff: number | null;

  saveAmount: number | null;
  maxQty: number | null;
};

type ApiResponse = {
  items: ScrapedItem[];
};

const DEFAULT_URLS = [
  "https://www.willys.se/erbjudanden/butik",
  //"https://www.ica.se/erbjudanden/ica-supermarket-cityhallen-vaxjo-1004104/",
];

async function fetchScrapedItems(urls: string[]): Promise<ScrapedItem[]> {
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

function formatKr(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)} kr`;
}

function formatPct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

export default function HomePage() {
  const [urlsText, setUrlsText] = useState(DEFAULT_URLS.join("\n"));
  const [items, setItems] = useState<ScrapedItem[] | null>(null);
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

    const num = (v: number | null | undefined, fallback: number) =>
      v == null || !Number.isFinite(v) ? fallback : v;

    switch (sortBy) {
      case "priceLowHigh":
        list.sort((a, b) => num(a.unitPrice, Number.POSITIVE_INFINITY) - num(b.unitPrice, Number.POSITIVE_INFINITY));
        break;
      case "priceHighLow":
        list.sort((a, b) => num(b.unitPrice, Number.NEGATIVE_INFINITY) - num(a.unitPrice, Number.NEGATIVE_INFINITY));
        break;
      case "percentOffLowHigh":
        list.sort((a, b) => num(a.percentOff, Number.POSITIVE_INFINITY) - num(b.percentOff, Number.POSITIVE_INFINITY));
        break;
      case "percentOffHighLow":
        list.sort((a, b) => num(b.percentOff, Number.NEGATIVE_INFINITY) - num(a.percentOff, Number.NEGATIVE_INFINITY));
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
              <option value="priceLowHigh">Unit price: low → high</option>
              <option value="priceHighLow">Unit price: high → low</option>
              <option value="percentOffLowHigh">Percent off: low → high</option>
              <option value="percentOffHighLow">Percent off: high → low</option>
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
              <OfferCard key={`${item.store}-${item.name}-${index}`} item={item} />
            ))
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </div>
    </main>
  );
}

function OfferCard({ item }: { item: ScrapedItem }) {
  const title = item.name ?? "Unnamed item";

  const unitLabel =
    item.unitPrice != null
      ? item.unit
        ? `${formatKr(item.unitPrice)} / ${item.unit}`
        : `${formatKr(item.unitPrice)}`
      : "—";

  return (
    <Card className="p-4 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold leading-snug">{title}</h2>
          <div className="text-sm text-gray-600">{item.store ?? "—"}</div>
        </div>

        {item.percentOff != null && Number.isFinite(item.percentOff) ? (
          <div className="text-sm font-semibold">
            -{formatPct(item.percentOff)}
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

      {item.description ? (
        <p className="mt-3 text-sm text-gray-700">{item.description}</p>
      ) : null}

      <div className="mt-3 text-sm text-gray-700 space-y-1">
        <div>
          <span className="font-medium">Price:</span>{" "}
          <span>{item.priceText ?? "—"}</span>
        </div>
        <div>
          <span className="font-medium">Unit price:</span>{" "}
          <span>{unitLabel}</span>
        </div>

        <div className="flex gap-4">
          <div>
            <span className="font-medium">Ord:</span> {formatKr(item.ordPrice)}
          </div>
          <div>
            <span className="font-medium">Save:</span> {formatKr(item.saveAmount)}
          </div>
        </div>

        <div>
          <span className="font-medium">Max köp:</span>{" "}
          <span>{item.maxQty ?? "—"}</span>
        </div>
      </div>

      {item.productUrl ? (
        <a
          href={item.productUrl}
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
