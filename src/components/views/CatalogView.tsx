"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import type { Product, Category, Company } from "@/lib/types/database";
import ProductCard from "@/components/ProductCard";

export default function CatalogView({
  products,
  categories,
  companies,
}: {
  products: Product[];
  categories: Category[];
  companies: Company[];
}) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8">Loading...</div>}>
      <CatalogContent
        products={products}
        categories={categories}
        companies={companies}
      />
    </Suspense>
  );
}

function CatalogContent({
  products,
  categories,
  companies,
}: {
  products: Product[];
  categories: Category[];
  companies: Company[];
}) {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || ""
  );
  const [sortBy, setSortBy] = useState("recent");

  const nameKey = `name_${locale}` as const;

  const companyMap = useMemo(() => {
    const map = new Map<string, Company>();
    companies.forEach((c) => map.set(c.id, c));
    return map;
  }, [companies]);

  const filtered = useMemo(() => {
    let result = products.filter((p) => p.is_active);

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name_fr.toLowerCase().includes(q) ||
          p.name_en.toLowerCase().includes(q) ||
          (p.description_fr || "").toLowerCase().includes(q) ||
          p.hs_code.includes(q)
      );
    }

    if (selectedCategory) {
      const cat = categories.find((c) => c.slug === selectedCategory);
      if (cat) {
        result = result.filter((p) => p.category_id === cat.id);
      }
    }

    switch (sortBy) {
      case "priceAsc":
        result = [...result].sort((a, b) => a.price_ftl - b.price_ftl);
        break;
      case "priceDesc":
        result = [...result].sort((a, b) => b.price_ftl - a.price_ftl);
        break;
      case "rating":
        result = [...result].sort(
          (a, b) =>
            (companyMap.get(b.seller_id)?.rating_avg ?? 0) -
            (companyMap.get(a.seller_id)?.rating_avg ?? 0)
        );
        break;
      default:
        result = [...result].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    return result;
  }, [products, search, selectedCategory, sortBy, categories, companyMap]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
        {t("catalog.title")}
      </h1>

      {/* Search bar */}
      <div className="mt-6">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder={t("catalog.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory("")}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              !selectedCategory
                ? "bg-brand-600 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:border-brand-300"
            }`}
          >
            {t("catalog.filter.all")}
          </button>
          {categories.map((cat) => {
            const name = cat[nameKey] || cat.name_fr;
            const active = selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-600 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-brand-300"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{name}</span>
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-gray-500">{t("catalog.sort")}:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
          >
            <option value="recent">{t("catalog.sort.recent")}</option>
            <option value="priceAsc">{t("catalog.sort.priceAsc")}</option>
            <option value="priceDesc">{t("catalog.sort.priceDesc")}</option>
            <option value="rating">{t("catalog.sort.rating")}</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="mt-4 text-sm text-gray-500">
        {filtered.length} {filtered.length > 1 ? "produits" : "produit"}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                company={companyMap.get(product.seller_id) ?? null}
                category={categories.find((c) => c.id === product.category_id) ?? null}
              />
            ))}
        </div>
      ) : (
        <div className="mt-20 text-center">
          <p className="text-lg text-gray-400">{t("catalog.empty")}</p>
        </div>
      )}
    </div>
  );
}
