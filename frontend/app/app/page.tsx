"use client";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type ScrapedItem = {
  name: string;
  text: string;
  price: string;
  priceUnit?: number;
  imageUrl: string;
  ordPrice?: number;
  percentOff?: number;
  store: string;
};

async function fetchData() {
  
  const response = await fetch('http://localhost:5005/scrape/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: 'https://www.ica.se/erbjudanden/ica-supermarket-cityhallen-vaxjo-1004104/' })
  });
  const data = await response.json();
  return data;
}



const HomePage = () => {
  const [data, setData] = useState<ScrapedItem[] | null>(null);
  const [sortBy, setSortBy] = useState("priceLowHigh");


  useEffect(() => {
    fetchData().then((data) => {
      console.log("Fetched data:", data.scrapeId);
      const items = []
      for(const item of data.scrapeId){
        const match = item.text.match(/Ord\.pris\s+(\d+:\d+)/);
        const ordinaryPriceString = match ? match[1] : null;
        item.ordPrice = ordinaryPriceString 
          ? parseFloat(ordinaryPriceString.replace(":", "."))
          : null;

        console.log("Item:", item);
        items.push(item);

        if(item.price.includes("för")){
          const parts = item.price.split("för");
          
          
          parts[0] = parts[0].trim();
          parts[1] = parts[1].replace("kr","").trim();
          const unitPrice = parseFloat(parts[1]) / parseFloat(parts[0]);
          item.priceUnit = parseFloat(unitPrice.toFixed(2));
          }
        else{
          item.priceUnit = parseFloat(item.price.replace("kr","").trim());
        }
        const difference = item.ordPrice - item.priceUnit;

        item.percentOff = difference / item.ordPrice
        item.percentOff = parseFloat((item.percentOff * 100).toFixed(2));
        item.store = "ICA"; // FIXME  
        




      }
      setData(items);
    });
  }, []);
  const sortedData = useMemo(() => {
    if (!Array.isArray(data)) return null;
    const items = [...data];
    switch (sortBy) {
      case "priceLowHigh":
        items.sort(
          (a, b) => (a.priceUnit ?? Number.POSITIVE_INFINITY) - (b.priceUnit ?? Number.POSITIVE_INFINITY)
        );
        break;
      case "priceHighLow":
        items.sort(
          (a, b) => (b.priceUnit ?? Number.NEGATIVE_INFINITY) - (a.priceUnit ?? Number.NEGATIVE_INFINITY)
        );
        break;
      case "percentOffLowHigh":
        items.sort(
          (a, b) => (a.percentOff ?? Number.POSITIVE_INFINITY) - (b.percentOff ?? Number.POSITIVE_INFINITY)
        );
        break;
      case "percentOffHighLow":
        items.sort(
          (a, b) => (b.percentOff ?? Number.NEGATIVE_INFINITY) - (a.percentOff ?? Number.NEGATIVE_INFINITY)
        );
        break;
      default:
        break;
    }
    return items;
  }, [data, sortBy]);

  return (
    <main className="min-h-screen p-24">
      <h1 className="text-4xl font-bold mb-8">Scraped Items</h1>
      <div className="mb-6 flex items-center gap-3">
        <label htmlFor="sort" className="text-sm font-medium">
          Sort by
        </label>
        <select
          id="sort"
          className="rounded-md border px-3 py-2 text-sm"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
        >
          <option value="priceLowHigh">Price: low → high</option>
          <option value="priceHighLow">Price: high → low</option>
          <option value="percentOffLowHigh">Percent off: low → high</option>
          <option value="percentOffHighLow">Percent off: high → low</option>
        </select>
      </div>

      
      <div className="w-full max-w-7xl mx-auto grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.isArray(sortedData) ? (
          sortedData.map((item, index) => (
            <Item
              key={index}
              title={item.name}
              description={item.text}
              price={item.price}
              imageURL={item.imageUrl}
              percentOff={item.percentOff || 0}
              store={item.store}
            />
          ))
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </main>
  );
}

const Item = ({ title, store, description, price, imageURL, percentOff }: { title: string; store: string; description: string; price: string; imageURL: string; percentOff:number }) => {
  return (
    <Card className=" p-4 ">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <h3>
        <span className="font-normal">{store}</span>
      </h3>
      <Image src={imageURL} alt={title} width={200} height={200} className="mt-4 rounded-md" />
      <p className="mt-2 text-gray-600">{description}</p>
      <p className="mt-2 text-gray-600">{price}</p>
      <p className="mt-2 text-gray-600">{percentOff + "%"}</p>
      

    </Card>
  );
}



export default HomePage;
