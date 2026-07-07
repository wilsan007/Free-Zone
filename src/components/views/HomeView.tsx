"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import type { Product, Category, Company, ConsolidationPool } from "@/lib/types/database";
import ProductCard from "@/components/ProductCard";
import ConsolidationGauge from "@/components/ConsolidationGauge";

export default function HomeView({
  products,
  categories,
  companies,
  pools,
}: {
  products: Product[];
  categories: Category[];
  companies: Company[];
  pools: ConsolidationPool[];
}) {
  const companyMap = new Map<string, Company>(companies.map((c) => [c.id, c]));
  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));
  const { t } = useI18n();

  const featuredProducts = products.slice(0, 4);
  const openPools = pools.filter((p) => p.status === "open");

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-white blur-3xl" />
          <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-accent-400 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              {t("home.hero.title")}
            </h1>
            <p className="mt-4 text-lg text-brand-100 sm:text-xl">
              {t("home.hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/catalog"
                className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-lg hover:bg-brand-50 transition-colors"
              >
                {t("home.hero.cta")}
              </Link>
              <Link
                href="/register"
                className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
              >
                {t("home.hero.cta2")}
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { value: "20+", label: t("home.stats.sellers") },
              { value: "1,200+", label: t("home.stats.products") },
              { value: "1", label: t("home.stats.corridor") },
              { value: "$2.4M+", label: t("home.stats.volume") },
            ].map((stat, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
              >
                <p className="text-2xl font-bold sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-xs text-brand-100 sm:text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          {t("home.features.title")}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "📦", title: t("home.features.f1.title"), desc: t("home.features.f1.desc") },
            { icon: "🔒", title: t("home.features.f2.title"), desc: t("home.features.f2.desc") },
            { icon: "🚚", title: t("home.features.f3.title"), desc: t("home.features.f3.desc") },
            { icon: "📍", title: t("home.features.f4.title"), desc: t("home.features.f4.desc") },
          ].map((f, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl">
                {f.icon}
              </div>
              <h3 className="mt-4 text-base font-semibold text-gray-900">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Groupage highlight */}
      <section className="bg-sand-100 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                {t("home.groupage.title")}
              </h2>
              <p className="mt-4 text-base text-gray-600">
                {t("home.groupage.desc")}
              </p>
              <Link
                href="/groupage"
                className="mt-6 inline-block rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
              >
                {t("home.groupage.cta")}
              </Link>
            </div>

            <div className="space-y-4">
              {openPools.map((pool) => (
                <ConsolidationGauge key={pool.id} pool={pool} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {t("catalog.title")}
          </h2>
          <Link
            href="/catalog"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            {t("nav.catalog")} →
          </Link>
        </div>

        {/* Category pills */}
        <div className="mt-6 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/catalog?category=${cat.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors"
            >
              <span>{cat.icon}</span>
              <span>{cat.name_fr}</span>
            </Link>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              company={companyMap.get(product.seller_id) ?? null}
              category={categoryMap.get(product.category_id) ?? null}
            />
          ))}
        </div>
      </section>

      {/* Trust section */}
      <section className="bg-gray-900 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">
            {t("home.trust.title")}
          </h2>
          <p className="mt-4 text-base text-gray-300">
            {t("home.trust.desc")}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-12 text-center text-white sm:px-12 sm:py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">
            {t("home.cta.title")}
          </h2>
          <p className="mt-3 text-base text-brand-100">
            {t("home.cta.desc")}
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-xl bg-white px-8 py-3 text-sm font-semibold text-brand-700 shadow-lg hover:bg-brand-50 transition-colors"
          >
            {t("home.cta.button")}
          </Link>
        </div>
      </section>
    </div>
  );
}
