"use client";

import { useI18n } from "@/lib/i18n/context";

// Panneau « pourquoi passer par la plateforme » — rend visible la valeur
// qu'un acheteur/vendeur perd s'il conclut la transaction hors plateforme.
export default function PlatformProtection({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();

  const items = [
    { icon: "🔒", key: "protection.escrow" },
    { icon: "⚖️", key: "protection.dispute" },
    { icon: "📄", key: "protection.docs" },
    { icon: "⭐", key: "protection.rating" },
    { icon: "🚚", key: "protection.tracking" },
  ];

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-green-800">
        🛡️ {t("protection.title")}
      </p>
      <ul className={`mt-3 space-y-2 ${compact ? "" : "sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0"}`}>
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-2 text-xs text-green-900">
            <span aria-hidden>{item.icon}</span>
            {t(item.key)}
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-green-200 pt-3 text-xs font-medium text-amber-700">
        ⚠️ {t("protection.warning")}
      </p>
    </div>
  );
}
