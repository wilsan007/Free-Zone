"use client";

import { useI18n } from "@/lib/i18n/context";

// Paliers de commission dégressive : plus une entreprise transige VIA la
// plateforme, moins elle paie — l'incitation économique à ne pas la contourner.
export const TIERS = [
  { key: "bronze", icon: "🥉", minVolumeUsd: 0, ftlPct: 3.0, ltlPct: 8.0 },
  { key: "silver", icon: "🥈", minVolumeUsd: 50_000, ftlPct: 2.5, ltlPct: 7.0 },
  { key: "gold", icon: "🥇", minVolumeUsd: 250_000, ftlPct: 2.0, ltlPct: 6.0 },
  { key: "platinum", icon: "💎", minVolumeUsd: 1_000_000, ftlPct: 1.5, ltlPct: 5.0 },
] as const;

export function tierForVolume(volumeUsd: number) {
  return [...TIERS].reverse().find((t) => volumeUsd >= t.minVolumeUsd) ?? TIERS[0];
}

export default function LoyaltyTier({ volumeUsd }: { volumeUsd: number }) {
  const { t } = useI18n();
  const current = tierForVolume(volumeUsd);
  const next = TIERS.find((tier) => tier.minVolumeUsd > volumeUsd);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{t("loyalty.title")}</p>
      <p className="mt-1 flex items-center gap-2 text-lg font-bold text-gray-900">
        <span aria-hidden>{current.icon}</span>
        {t(`loyalty.tier.${current.key}`)}
      </p>
      <p className="mt-1 text-xs text-gray-600">
        {t("loyalty.commission")} : {current.ftlPct}% FTL · {current.ltlPct}% {t("loyalty.groupage")}
      </p>
      {next && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-600"
              style={{ width: `${Math.min(100, (volumeUsd / next.minVolumeUsd) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            {t("loyalty.nextTier")
              .replace("{amount}", `$${(next.minVolumeUsd - volumeUsd).toLocaleString()}`)
              .replace("{tier}", t(`loyalty.tier.${next.key}`))}
          </p>
        </div>
      )}
    </div>
  );
}
