import NewProductView from "@/components/views/NewProductView";
import { getCategories } from "@/lib/supabase/queries";

export default async function NewProductPage() {
  const categories = await getCategories();
  const simpleCategories = categories.map((c) => ({
    id: c.id,
    name_fr: c.name_fr,
    slug: c.slug,
  }));

  return <NewProductView categories={simpleCategories} />;
}
