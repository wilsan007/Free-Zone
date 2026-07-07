"use client";

import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n/context";
import type { Product, Company, Category } from "@/lib/types/database";
import TrustBadge from "./TrustBadge";

export default function ProductCard({
  product,
  company,
  category,
}: {
  product: Product;
  company?: Company | null;
  category?: Category | null;
}) {
  const { locale, t } = useI18n();

  const nameKey = `name_${locale}` as keyof Product;
  const name = (product[nameKey] || product.name_fr) as string;

  const availableStock = product.stock_qty - product.reserved_qty;

  return (
    <Link
      href={`/catalog/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:shadow-lg hover:border-brand-300"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        {product.reliability_badge && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-blue-700 backdrop-blur-sm">
            ✓ {t("badge.reliable")}
          </span>
        )}
        {category && (
          <span className="absolute right-2 top-2 rounded-full bg-gray-900/70 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            {category.icon}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-brand-700">
          {name}
        </h3>

        {company && (
          <p className="mt-1 text-xs text-gray-500">{company.name}</p>
        )}

        {/* Badges */}
        <div className="mt-2">
          <TrustBadge
            verified={company?.verified_on_site}
            rating={company?.rating_avg}
            ratingCount={company?.rating_count}
          />
        </div>

        {/* Stock */}
        <p className="mt-2 text-xs text-gray-500">
          {availableStock.toLocaleString()} {product.unit}s {t("product.inStock")}
        </p>

        {/* Prices */}
        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-brand-700">
              ${product.price_ftl}
            </span>
            <span className="text-xs text-gray-400">
              {t("product.priceFtl")}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-gray-600">
              ${product.price_ltl}
            </span>
            <span className="text-xs text-gray-400">
              {t("product.priceLtl")}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
