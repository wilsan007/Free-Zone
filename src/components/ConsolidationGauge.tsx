"use client";

import { useI18n } from "@/lib/i18n/context";
import type { ConsolidationPool } from "@/lib/types/database";

export default function ConsolidationGauge({ pool }: { pool: ConsolidationPool }) {
  const { t } = useI18n();

  const fillColor =
    pool.fill_pct >= 90
      ? "bg-green-500"
      : pool.fill_pct >= 60
      ? "bg-brand-500"
      : "bg-amber-500";

  const daysUntilDeadline = Math.ceil(
    (new Date(pool.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const etaText =
    daysUntilDeadline <= 0
      ? t("gauge.soon")
      : daysUntilDeadline === 1
      ? `1 ${t("gauge.day")}`
      : `${daysUntilDeadline} ${t("gauge.days")}`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚚</span>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {pool.destination_city}
            </p>
            <p className="text-xs text-gray-500">
              {t("gauge.eta")}: {etaText}
            </p>
          </div>
        </div>
        <span className="text-2xl font-bold text-gray-900">{pool.fill_pct}%</span>
      </div>

      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`gauge-bar h-full rounded-full ${fillColor} transition-all duration-500`}
          style={{ width: `${pool.fill_pct}%` }}
        />
      </div>

      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span>
          {Math.round(pool.current_weight_kg).toLocaleString()} / {Math.round(pool.max_weight_kg).toLocaleString()} kg
        </span>
        <span>{t("gauge.filled")}</span>
      </div>
    </div>
  );
}
