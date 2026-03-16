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

  // Deep-serialize all Mongoose documents to plain objects
  // JSON round-trip strips ObjectIds, Buffers, and toJSON methods from subdocuments (variants, attributes, etc.)
  const products = JSON.parse(JSON.stringify(productsRaw));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialSettings: Record<string, any> = {};
  const settingsPlain = JSON.parse(JSON.stringify(allSettings));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settingsPlain.forEach((s: any) => { initialSettings[s.key] = s.value; });

  return (
    <HomeClient initialProducts={products} initialSettings={initialSettings} />
  );
}
