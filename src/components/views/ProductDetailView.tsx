"use client";

import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n/context";
import type { Product, Company, Category, ConsolidationPool } from "@/lib/types/database";
import { COMPATIBILITY_LABELS } from "@/lib/types/database";
import TrustBadge from "@/components/TrustBadge";
import ConsolidationGauge from "@/components/ConsolidationGauge";
import MessageThread from "@/components/MessageThread";
import PlatformProtection from "@/components/PlatformProtection";
import TrustScore from "@/components/TrustScore";

export default function ProductDetailView({
  product,
  company,
  category,
  relatedPools,
}: {
  product: Product | null;
  company: Company | null;
  category: Category | null;
  relatedPools: ConsolidationPool[];
}) {
  const { locale, t } = useI18n();

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <p className="text-lg text-gray-400">Product not found</p>
        <Link
          href="/catalog"
          className="mt-4 inline-block text-sm font-semibold text-brand-600"
        >
          ← {t("product.back")}
        </Link>
      </div>
    );
  }

  const availableStock = product.stock_qty - product.reserved_qty;

  const nameKey = `name_${locale}` as keyof Product;
  const name = (product[nameKey] || product.name_fr) as string;

  const descKey = `description_${locale}` as keyof Product;
  const description = (product[descKey] || product.description_fr) as string;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <Link
        href="/catalog"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t("product.back")}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
          {product.images[0] && (
            <Image
              src={product.images[0]}
              alt={name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          )}
        </div>

        {/* Info */}
        <div>
          {category && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
              {category.icon} {category[`name_${locale}` as keyof Category] || category.name_fr}
            </span>
          )}

          <h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">
            {name}
          </h1>

          {/* Seller info */}
          {company && (
            <>
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-600">
                  {company.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{company.name}</p>
                  <p className="text-xs text-gray-500">{company.city}</p>
                </div>
                <TrustBadge
                  verified={company.verified_on_site}
                  rating={company.rating_avg}
                  ratingCount={company.rating_count}
                />
              </div>
              {/* Score de confiance dynamique (monte et descend) */}
              <TrustScore companyId={company.id} />
              {/* RFQ — négociation traçée sur la plateforme */}
              <MessageThread productId={product.id} sellerCompanyId={company.id} />
            </>
          )}

          {/* Badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <TrustBadge reliable={product.reliability_badge} />
            {product.compatibility_class && COMPATIBILITY_LABELS[product.compatibility_class] && (
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${COMPATIBILITY_LABELS[product.compatibility_class].color}`}>
                {COMPATIBILITY_LABELS[product.compatibility_class].icon} {COMPATIBILITY_LABELS[product.compatibility_class].fr}
              </span>
            )}
          </div>

          {/* Prices */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {/* FTL price */}
            <div className="rounded-xl border-2 border-brand-200 bg-brand-50 p-4">
              <p className="text-xs font-medium text-brand-700">
                {t("product.priceFtl")}
              </p>
              <p className="mt-1 text-2xl font-bold text-brand-700">
                ${product.price_ftl}
                <span className="text-sm font-normal text-brand-600">
                  {" "}{t("common.perUnit")}
                </span>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {t("product.moq")}: {product.moq} {product.unit}s
              </p>
              <Link href={`/order/${product.id}`} className="mt-3 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors block text-center">
                {t("product.buyFtl")}
              </Link>
            </div>

            {/* LTL price */}
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-medium text-amber-700">
                {t("product.priceLtl")}
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-700">
                ${product.price_ltl}
                <span className="text-sm font-normal text-amber-600">
                  {" "}{t("common.perUnit")}
                </span>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {t("product.moq")}: 1 {product.unit}
              </p>
              <Link href={`/order/${product.id}`} className="mt-3 w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors block text-center">
                {t("product.buyLtl")}
              </Link>
            </div>
          </div>

          {/* Stock */}
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
            <span className="font-medium text-gray-900">
              {availableStock.toLocaleString()} {product.unit}s {t("product.inStock")}
            </span>
          </div>

          {/* Protection plateforme */}
          <div className="mt-4">
            <PlatformProtection compact />
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        {/* Description */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900">
            {t("product.description")}
          </h2>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            {description}
          </p>

          {/* Specs */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{t("product.hsCode")}</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {product.hs_code}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{t("product.weight")}</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {product.unit_weight_kg} kg
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{t("product.volume")}</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {product.unit_volume_m3} m³
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{t("product.unit")}</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {product.unit}
              </p>
            </div>
          </div>
        </div>

        {/* Groupage pools */}
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {t("product.relatedPools")}
          </h2>
          <div className="mt-4 space-y-4">
            {relatedPools.length > 0 ? (
              relatedPools.map((pool) => (
                <ConsolidationGauge key={pool.id} pool={pool} />
              ))
            ) : (
              <p className="text-sm text-gray-400">—</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
