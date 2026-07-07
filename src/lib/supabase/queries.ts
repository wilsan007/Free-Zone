import { createClient } from "@/lib/supabase/server";
import type {
  Product,
  Category,
  Company,
  ConsolidationPool,
} from "@/lib/types/database";

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name_fr");

  if (error) {
    console.error("getCategories:", error);
    return [];
  }

  return data as Category[];
}

export async function getCategoryBySlug(
  slug: string
): Promise<Category | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("getCategoryBySlug:", error);
    return null;
  }

  return data as Category;
}

export async function getCategoryById(
  id: string
): Promise<Category | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getCategoryById:", error);
    return null;
  }

  return data as Category;
}

export async function getCompanies(): Promise<Company[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("rating_avg", { ascending: false });

  if (error) {
    console.error("getCompanies:", error);
    return [];
  }

  return data as Company[];
}

export async function getCompanyById(
  id: string
): Promise<Company | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getCompanyById:", error);
    return null;
  }

  return data as Company;
}

export async function getProducts(filters?: {
  categoryId?: string;
  categorySlug?: string;
  search?: string;
  sortBy?: "recent" | "priceAsc" | "priceDesc" | "rating";
  limit?: number;
}): Promise<Product[]> {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*")
    .eq("is_active", true);

  if (filters?.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  if (filters?.categorySlug) {
    const cat = await getCategoryBySlug(filters.categorySlug);
    if (cat) {
      query = query.eq("category_id", cat.id);
    }
  }

  if (filters?.search) {
    query = query.or(
      `name_fr.ilike.%${filters.search}%,name_en.ilike.%${filters.search}%,hs_code.ilike.%${filters.search}%`
    );
  }

  switch (filters?.sortBy) {
    case "priceAsc":
      query = query.order("price_ftl", { ascending: true });
      break;
    case "priceDesc":
      query = query.order("price_ftl", { ascending: false });
      break;
    case "rating":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getProducts:", error);
    return [];
  }

  return data as Product[];
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getProductById:", error);
    return null;
  }

  return data as Product;
}

export async function getConsolidationPools(
  filters?: { status?: string; categorySlug?: string }
): Promise<ConsolidationPool[]> {
  const supabase = await createClient();
  let query = supabase
    .from("consolidation_pools")
    .select("*")
    .order("deadline", { ascending: true });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  } else {
    query = query.eq("status", "open");
  }

  const { data, error } = await query;

  if (error) {
    console.error("getConsolidationPools:", error);
    return [];
  }

  let pools = data as ConsolidationPool[];

  if (filters?.categorySlug) {
    pools = pools.filter((p) =>
      p.product_category_compatible
        .split(",")
        .includes(filters.categorySlug!)
    );
  }

  return pools;
}
