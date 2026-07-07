import CatalogView from "@/components/views/CatalogView";
import {
  getProducts,
  getCategories,
  getCompanies,
} from "@/lib/supabase/queries";

export default async function CatalogPage() {
  const [products, categories, companies] = await Promise.all([
    getProducts(),
    getCategories(),
    getCompanies(),
  ]);

  return (
    <CatalogView
      products={products}
      categories={categories}
      companies={companies}
    />
  );
}
