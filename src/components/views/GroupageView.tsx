"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type { ConsolidationPool } from "@/lib/types/database";
import { COMPATIBILITY_LABELS, COMPATIBLE_CLASSES, type CompatibilityClass } from "@/lib/types/database";
import ConsolidationGauge from "@/components/ConsolidationGauge";

export default function GroupageView({
  pools,
}: {
  pools: ConsolidationPool[];
}) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"all" | "by_product" | "by_destination">("all");
  const [filterCompat, setFilterCompat] = useState<CompatibilityClass | "all">("all");

  const openPools = pools.filter((p) => p.status === "open");

  const filteredPools = openPools.filter((pool) => {
    if (activeTab !== "all" && pool.pool_type !== activeTab) return false;
    if (filterCompat !== "all" && pool.compatibility_class !== filterCompat) return false;
    return true;
  });

  const byProductCount = openPools.filter((p) => p.pool_type === "by_product").length;
  const byDestinationCount = openPools.filter((p) => p.pool_type === "by_destination").length;

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

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("all")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "all" ? "bg-brand-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {t("groupage.all")} ({openPools.length})
        </button>
        <button
          onClick={() => setActiveTab("by_product")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "by_product" ? "bg-brand-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          📦 {t("groupage.byProduct")} ({byProductCount})
        </button>
        <button
          onClick={() => setActiveTab("by_destination")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "by_destination" ? "bg-brand-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          🚚 {t("groupage.byDestination")} ({byDestinationCount})
        </button>
      </div>

      {/* Compatibility filter */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500">{t("groupage.filterCompat")}:</span>
        <button
          onClick={() => setFilterCompat("all")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            filterCompat === "all" ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {t("groupage.allClasses")}
        </button>
        {(Object.keys(COMPATIBILITY_LABELS) as CompatibilityClass[]).map((cls) => (
          <button
            key={cls}
            onClick={() => setFilterCompat(cls)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterCompat === cls ? COMPATIBILITY_LABELS[cls].color + " ring-2 ring-offset-1" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {COMPATIBILITY_LABELS[cls].icon} {COMPATIBILITY_LABELS[cls].fr}
          </button>
        ))}
      </div>

      {/* Pools grid */}
      <div className="mt-6">
        {filteredPools.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPools.map((pool) => (
              <ConsolidationGauge key={pool.id} pool={pool} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <div className="text-3xl">📭</div>
            <p className="mt-3 text-sm text-gray-500">{t("groupage.noPools")}</p>
          </div>
        )}
      </div>

      {/* Compatibility matrix */}
      <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-bold text-gray-900">{t("groupage.compatMatrix")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("groupage.compatMatrixDesc")}</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-2 text-left text-gray-400"></th>
                {(Object.keys(COMPATIBILITY_LABELS) as CompatibilityClass[]).map((cls) => (
                  <th key={cls} className="p-2 text-center" title={COMPATIBILITY_LABELS[cls].fr}>
                    {COMPATIBILITY_LABELS[cls].icon}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(COMPATIBILITY_LABELS) as CompatibilityClass[]).map((rowCls) => {
                return (
                  <tr key={rowCls}>
                    <td className="p-2 text-left font-medium text-gray-700 whitespace-nowrap">
                      {COMPATIBILITY_LABELS[rowCls].icon} {COMPATIBILITY_LABELS[rowCls].fr}
                    </td>
                    {(Object.keys(COMPATIBILITY_LABELS) as CompatibilityClass[]).map((colCls) => {
                      const compatible = COMPATIBLE_CLASSES[rowCls]?.includes(colCls);
                      return (
                        <td key={colCls} className="p-2 text-center">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                            compatible ? "bg-green-100 text-green-600" : "bg-red-50 text-red-300"
                          }`}>
                            {compatible ? "✓" : "✕"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8">
        <h2 className="text-lg font-bold text-gray-900">
          {t("nav.howItWorks")}
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { num: "1", icon: "🛒", text: t("home.features.f3.desc") },
            { num: "2", icon: "📊", text: t("groupage.step2") },
            { num: "3", icon: "🚚", text: t("groupage.step3") },
            { num: "4", icon: "📦", text: t("groupage.step4") },
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
