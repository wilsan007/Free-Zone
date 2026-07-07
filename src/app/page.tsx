import HomeView from "@/components/views/HomeView";
import {
  getProducts,
  getCategories,
  getCompanies,
  getConsolidationPools,
} from "@/lib/supabase/queries";

export default async function HomePage() {
  const [products, categories, companies, pools] = await Promise.all([
    getProducts({ limit: 8 }),
    getCategories(),
    getCompanies(),
    getConsolidationPools({ status: "open" }),
  ]);

  return (
    <HomeView
      products={products}
      categories={categories}
      companies={companies}
      pools={pools}
    />
  );
}
