"use client";
import { Card } from "@/components/ui/card";
import Image from "next/image";

const exampleObject = {
  name: "Kycklingburgare, Kycklingköttbullar",
  text: "Kronfågel. Ursprung Sverige. 540-600 g. Jmfpris 65:83-73:15/kg. Ord.pris 58:90-62:90 kr.",
  price: "2 för 79 kr",
  imageUrl: "https://assets.icanet.se/$y_h,$x_w,$pi_current:public_id/c_fit,w_$x,h_$y,u_7300327602004,x_$y_mul_-0.3,y_$x_mul_0.6,g_south_east/c_lpad,q_auto,f_auto,w_200,h_200/7300327552002"
}

const HomePage = () => {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">Welcome to the Home Page</h1>
      <p className="mt-4 text-lg">This is the main content of the home page.</p>
      <Item title={exampleObject.name} description={exampleObject.text} price={exampleObject.price} imageURL={exampleObject.imageUrl}></Item>
    </main>
  );
}

const Item = ({ title, description, price, imageURL }: { title: string; description: string; price: string; imageURL: string }) => {
  return (
    <Card className="w-64 p-4 mt-8">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <Image src={imageURL} alt={title} width={200} height={200} className="mt-4 rounded-md" />
      <p className="mt-2 text-gray-600">{description}</p>
      <p className="mt-2 text-gray-600">{price}</p>


    </Card>
  );
}

export default HomePage;
