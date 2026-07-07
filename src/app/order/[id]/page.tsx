import OrderView from "@/components/views/OrderView";
import { getProductById, getCompanyById } from "@/lib/supabase/queries";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  const company = product ? await getCompanyById(product.seller_id) : null;

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <p className="text-lg text-gray-400">Product not found</p>
      </div>
    );
  }

  return <OrderView product={product} company={company} />;
}
