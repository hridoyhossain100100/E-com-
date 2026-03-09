import connectToDatabase from "@/lib/mongodb";
import ProductModel from "@/models/Product";
import Settings from "@/models/Settings";
import HomeClient from "./HomeClient";

// @web-performance-optimization: Fetch all data on the server for faster initial mobile load
export default async function HomePage() {
  await connectToDatabase();

  // Fetch products and settings concurrently
  // Using .lean() for faster Mongoose queries and serialization
  const [productsRaw, allSettings] = await Promise.all([
    ProductModel.find({}).sort({ createdAt: -1 }).lean(),
    Settings.find({}).lean()
  ]);

  // Transform MongoDB _id objects to strings for Client Component serialization
  const products = productsRaw.map(p => ({
    ...p,
    _id: p._id.toString(),
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString()
  }));

  const initialSettings: Record<string, any> = {};
  allSettings.forEach((s: any) => { initialSettings[s.key] = s.value; });

  return (
    <HomeClient initialProducts={products} initialSettings={initialSettings} />
  );
}
