"use client";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { useEffect } from "react";
import { useState } from "react";

type ScrapedItem = {
  name: string;
  text: string;
  price: string;
  imageUrl: string;
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


  useEffect(() => {
    fetchData().then((data) => {
      console.log("Fetched data:", data.scrapeId);
      setData(data.scrapeId);
    });
  }, []);

  return (
    <main className="min-h-screen p-24">
      <h1 className="text-4xl font-bold mb-8">Scraped Items</h1>
      <div className="w-full max-w-7xl mx-auto grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.isArray(data) ? (
          data.map((item, index) => (
            <Item
              key={index}
              title={item.name}
              description={item.text}
              price={item.price}
              imageURL={item.imageUrl}
            />
          ))
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </main>
  );
}

const Item = ({ title, description, price, imageURL }: { title: string; description: string; price: string; imageURL: string }) => {
  return (
    <Card className=" p-4 ">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <Image src={imageURL} alt={title} width={200} height={200} className="mt-4 rounded-md" />
      <p className="mt-2 text-gray-600">{description}</p>
      <p className="mt-2 text-gray-600">{price}</p>


    </Card>
  );
}

export default HomePage;
