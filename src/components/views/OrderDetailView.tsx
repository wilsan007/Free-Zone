"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types/database";
import PlatformProtection from "@/components/PlatformProtection";

const statusSteps: { key: Order["status"]; label: string; icon: string }[] = [
  { key: "created", label: "order.status.created", icon: "📝" },
  { key: "escrow_funded", label: "order.status.escrow_funded", icon: "🔒" },
  { key: "preparing", label: "order.status.preparing", icon: "📦" },
  { key: "loaded", label: "order.status.loaded", icon: "🚚" },
  { key: "in_transit", label: "order.status.in_transit", icon: "🛣️" },
  { key: "delivered", label: "order.status.delivered", icon: "✓" },
  { key: "funds_released", label: "order.status.funds_released", icon: "💰" },
];

export default function OrderDetailPage({
  orderId,
}: {
  orderId: string;
}) {
  const { t } = useI18n();
  const { user, profile } = useAuth();
  const supabase = createClient();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (data) setOrder(data as Order);
      setLoading(false);
    };
    fetchOrder();
  }, [orderId, supabase]);

  // Toutes les transitions de statut passent par des RPC serveur qui
  // vérifient le rôle (acheteur/vendeur) et la transition autorisée.
  const runAction = async (fn: string, args: Record<string, unknown> = {}) => {
    setActing(true);
    setActionError(null);
    const { error } = await supabase.rpc(fn, { p_order_id: orderId, ...args });
    if (error) {
      setActionError(error.message);
    } else {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (data) setOrder(data as Order);
    }
    setActing(false);
  };

  const handleDispute = () => {
    const reason = window.prompt(t("order.disputeReason"));
    if (reason && reason.trim().length >= 10) {
      runAction("open_dispute", { p_reason: reason.trim() });
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-gray-400">{t("common.loading")}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg text-gray-400">Order not found</p>
        <Link href="/catalog" className="mt-4 inline-block text-sm font-semibold text-brand-600">
          ← {t("nav.catalog")}
        </Link>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex((s) => s.key === order.status);
  const isDisputed = order.status === "disputed";
  const isCancelled = order.status === "cancelled";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("order.detail.title")} #{order.id.slice(0, 8)}
        </h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isDisputed
              ? "bg-red-100 text-red-700"
              : isCancelled
              ? "bg-gray-100 text-gray-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {t(`order.status.${order.status}` as string)}
        </span>
      </div>

      {/* Order info */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">{t("order.type")}</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 uppercase">{order.order_type}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">{t("order.qty")}</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{order.qty}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">{t("order.unitPrice")}</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">${order.unit_price}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">{t("order.total")}</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">${order.total_amount.toLocaleString()}</p>
        </div>
      </div>

      {/* Timeline */}
      {!isDisputed && !isCancelled && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900">{t("order.timeline")}</h2>
          <div className="mt-4 space-y-1">
            {statusSteps.map((step, index) => {
              const isDone = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <div key={step.key} className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                        isDone
                          ? "bg-brand-600 text-white"
                          : "bg-gray-100 text-gray-400"
                      } ${isCurrent ? "ring-4 ring-brand-100" : ""}`}
                    >
                      {isDone ? "✓" : step.icon}
                    </div>
                    {index < statusSteps.length - 1 && (
                      <div className={`h-8 w-0.5 ${index < currentStepIndex ? "bg-brand-600" : "bg-gray-200"}`} />
                    )}
                  </div>
                  <div className="pb-8">
                    <p className={`text-sm font-medium ${isDone ? "text-gray-900" : "text-gray-400"}`}>
                      {t(step.label)}
                    </p>
                    {isCurrent && (
                      <p className="mt-0.5 text-xs text-brand-600">{t("order.currentStep")}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Protection plateforme — rappelée au moment décisif du paiement */}
      {(order.status === "created" || order.status === "escrow_funded") && (
        <div className="mt-8">
          <PlatformProtection />
        </div>
      )}

      {actionError && (
        <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Actions — le serveur revérifie rôle et transition à chaque appel */}
      {(() => {
        const isBuyer = !!profile && order.buyer_id === profile.id;
        const isSeller = profile?.role === "seller" && !isBuyer;
        const sellerCanAdvance =
          isSeller &&
          ["escrow_funded", "preparing", "loaded", "in_transit"].includes(order.status);

        return (
          <div className="mt-8 flex flex-wrap gap-3">
            {isBuyer && order.status === "created" && (
              <>
                <button
                  onClick={() => runAction("fund_escrow")}
                  disabled={acting}
                  className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {acting ? t("common.loading") : t("order.fundEscrow")}
                </button>
                <button
                  onClick={() => runAction("cancel_order")}
                  disabled={acting}
                  className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {t("order.cancel")}
                </button>
              </>
            )}
            {sellerCanAdvance && (
              <button
                onClick={() => runAction("seller_advance_order")}
                disabled={acting}
                className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {acting ? t("common.loading") : t("order.advance")}
              </button>
            )}
            {isBuyer && order.status === "delivered" && (
              <button
                onClick={() => runAction("confirm_delivery")}
                disabled={acting}
                className="rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {acting ? t("common.loading") : t("order.confirmDelivery")}
              </button>
            )}
            {!isCancelled &&
              !isDisputed &&
              !["created", "funds_released"].includes(order.status) && (
                <button
                  onClick={handleDispute}
                  disabled={acting}
                  className="rounded-xl border border-red-200 px-6 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {t("order.dispute")}
                </button>
              )}
          </div>
        );
      })()}
    </div>
  );
}
