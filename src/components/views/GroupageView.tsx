"use client";

import { useI18n } from "@/lib/i18n/context";
import type { ConsolidationPool } from "@/lib/types/database";
import ConsolidationGauge from "@/components/ConsolidationGauge";

export default function GroupageView({
  pools,
}: {
  pools: ConsolidationPool[];
}) {
  const { t } = useI18n();

  const openPools = pools.filter((p) => p.status === "open");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {t("home.groupage.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-brand-100">
          {t("home.groupage.desc")}
        </p>
      </div>

      {/* Pools grid */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900">
          {t("product.relatedPools")}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {openPools.map((pool) => (
            <ConsolidationGauge key={pool.id} pool={pool} />
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-8">
        <h2 className="text-lg font-bold text-gray-900">
          {t("nav.howItWorks")}
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { num: "1", icon: "🛒", text: t("home.features.f3.desc") },
            { num: "2", icon: "📊", text: "Suivez la jauge de remplissage en temps réel" },
            { num: "3", icon: "🚚", text: "Le camion part quand le seuil est atteint" },
            { num: "4", icon: "📦", text: "Récupérez votre colis au hub de destination" },
          ].map((step) => (
            <div key={step.num} className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl">
                {step.icon}
              </div>
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {step.num}
              </span>
              <p className="mt-3 text-sm text-gray-600">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
