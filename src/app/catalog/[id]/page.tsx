import ProductDetailView from "@/components/views/ProductDetailView";
import {
  getProductById,
  getCompanyById,
  getCategoryById,
  getConsolidationPools,
} from "@/lib/supabase/queries";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await getProductById(id);

  let company = null;
  let category = null;

  if (product) {
    company = await getCompanyById(product.seller_id);
    category = await getCategoryById(product.category_id);
  }

  let relatedPools: Awaited<ReturnType<typeof getConsolidationPools>> = [];
  if (category) {
    relatedPools = await getConsolidationPools({
      status: "open",
      categorySlug: category.slug,
    });
  }

  return (
    <ProductDetailView
      product={product}
      company={company}
      category={category}
      relatedPools={relatedPools}
    />
  );
}
