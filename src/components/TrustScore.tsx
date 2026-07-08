"use client";

// ============================================================
// Score de confiance dynamique (0–100) — calculé côté serveur par la
// vue company_trust_scores (migration v3). Monte avec les transactions
// réussies SUR la plateforme, baisse avec les litiges et tentatives de
// contournement : la réputation devient un actif captif.
// ============================================================

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";

type TrustScoreRow = {
  company_id: string;
  score: number;
  rating_avg: number;
  rating_count: number;
  orders_completed: number;
  months_active: number;
  verified_on_site: boolean;
  reliability_badge: boolean;
  response_bucket: "fast" | "day" | "slow" | "none";
  disputes_cnt: number;
};

function levelFor(score: number): { key: string; icon: string; classes: string } {
  if (score >= 80) return { key: "gold", icon: "🥇", classes: "bg-amber-50 border-amber-200 text-amber-800" };
  if (score >= 60) return { key: "silver", icon: "🥈", classes: "bg-gray-50 border-gray-300 text-gray-700" };
  if (score >= 40) return { key: "bronze", icon: "🥉", classes: "bg-orange-50 border-orange-200 text-orange-800" };
  return { key: "new", icon: "🌱", classes: "bg-green-50 border-green-200 text-green-800" };
}

export default function TrustScore({ companyId }: { companyId: string }) {
  const { t } = useI18n();
  const supabase = createClient();
  const [row, setRow] = useState<TrustScoreRow | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchScore = async () => {
      const { data } = await supabase
        .from("company_trust_scores")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (data) setRow(data as TrustScoreRow);
    };
    fetchScore();
  }, [companyId, supabase]);

  // Vue absente (migration v3 non appliquée) ou entreprise inconnue : silencieux
  if (!row) return null;

  const level = levelFor(row.score);

  const details = [
    row.rating_count > 0
      ? `⭐ ${t("trust.rating")} : ${row.rating_avg}/5 (${row.rating_count})`
      : null,
    `📦 ${t("trust.orders")} : ${row.orders_completed}`,
    `📅 ${t("trust.seniority")} : ${row.months_active} ${t("trust.months")}`,
    `⚡ ${t(`trust.response.${row.response_bucket}`)}`,
    row.disputes_cnt > 0 ? `⚖️ ${t("trust.disputes")} : ${row.disputes_cnt}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className={`mt-3 rounded-xl border p-3 ${level.classes}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          {level.icon} {t("trust.score")} : {row.score}/100 — {t(`trust.level.${level.key}`)}
        </span>
        <span className="text-xs opacity-60">{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Barre de score */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/60">
        <div
          className="h-full rounded-full bg-current opacity-70"
          style={{ width: `${row.score}%` }}
        />
      </div>

      {expanded && (
        <div className="mt-3 space-y-1">
          {details.map((d) => (
            <p key={d} className="text-xs">{d}</p>
          ))}
          <p className="mt-2 border-t border-current/20 pt-2 text-[11px] opacity-75">
            ℹ️ {t("trust.downInfo")}
          </p>
        </div>
      )}
    </div>
  );
}
