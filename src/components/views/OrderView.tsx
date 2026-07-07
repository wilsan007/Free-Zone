"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import type { Product, Company } from "@/lib/types/database";

export default function OrderView({
  product,
  company,
}: {
  product: Product;
  company: Company | null;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [orderType, setOrderType] = useState<"ftl" | "ltl">("ftl");
  const [qty, setQty] = useState(orderType === "ftl" ? product.moq : 1);
  const [destination, setDestination] = useState("Addis-Abeba");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Erreurs métier renvoyées par la RPC create_order
  const rpcErrors: Record<string, string> = {
    AUTH_REQUIRED: t("order.loginRequired"),
    PRODUCT_NOT_FOUND: "Produit indisponible",
    QTY_BELOW_MOQ: `${t("product.moq")}: ${product.moq} ${product.unit}s`,
    INSUFFICIENT_STOCK: "Stock disponible insuffisant",
  };

  const unitPrice = orderType === "ftl" ? product.price_ftl : product.price_ltl;
  const totalAmount = unitPrice * qty;
  const availableStock = product.stock_qty - product.reserved_qty;

  const handleQtyChange = (val: number) => {
    if (orderType === "ftl" && val < product.moq) val = product.moq;
    if (val < 1) val = 1;
    if (val > availableStock) val = availableStock;
    setQty(val);
  };

  const handleOrderTypeChange = (type: "ftl" | "ltl") => {
    setOrderType(type);
    setQty(type === "ftl" ? product.moq : 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      router.push("/login?redirect=order");
      return;
    }

    setLoading(true);

    // Prix, réservation de stock et rattachement au pool de groupage sont
    // calculés atomiquement côté serveur (RPC create_order) : le client
    // n'envoie ni prix ni total, et deux achats simultanés ne peuvent pas
    // survendre le stock.
    const { data: orderId, error: orderError } = await supabase.rpc("create_order", {
      p_product_id: product.id,
      p_order_type: orderType,
      p_qty: qty,
      p_destination_city: destination,
    });

    if (orderError || !orderId) {
      const code = Object.keys(rpcErrors).find((k) =>
        orderError?.message?.includes(k)
      );
      setError(code ? rpcErrors[code] : orderError?.message ?? "Erreur inconnue");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push(`/orders/${orderId}`), 1500);
  };

  if (success) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <div className="text-4xl">✓</div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">{t("order.success")}</h1>
          <p className="mt-2 text-sm text-gray-600">{t("order.successDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/catalog/${product.id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600"
      >
        ← {t("product.back")}
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900">{t("order.title")}</h1>

      {/* Product summary */}
      <div className="mt-6 flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{product.name_fr}</p>
          {company && <p className="text-xs text-gray-500">{company.name}</p>}
        </div>
        <p className="text-sm text-gray-500">
          {availableStock.toLocaleString()} {product.unit}s {t("product.inStock")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Order type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("order.type")}</label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleOrderTypeChange("ftl")}
              className={`rounded-xl border-2 p-4 text-left transition-colors ${
                orderType === "ftl"
                  ? "border-brand-500 bg-brand-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className="text-sm font-semibold text-gray-900">{t("product.priceFtl")}</p>
              <p className="mt-1 text-lg font-bold text-brand-700">${product.price_ftl}</p>
              <p className="text-xs text-gray-500">MOQ: {product.moq}</p>
            </button>
            <button
              type="button"
              onClick={() => handleOrderTypeChange("ltl")}
              className={`rounded-xl border-2 p-4 text-left transition-colors ${
                orderType === "ltl"
                  ? "border-amber-500 bg-amber-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className="text-sm font-semibold text-gray-900">{t("product.priceLtl")}</p>
              <p className="mt-1 text-lg font-bold text-amber-700">${product.price_ltl}</p>
              <p className="text-xs text-gray-500">MOQ: 1</p>
            </button>
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("order.qty")}</label>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleQtyChange(qty - 1)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-lg font-bold text-gray-600 hover:bg-gray-100"
            >
              -
            </button>
            <input
              type="number"
              value={qty}
              onChange={(e) => handleQtyChange(parseInt(e.target.value) || 1)}
              className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-center text-sm focus:border-brand-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleQtyChange(qty + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-lg font-bold text-gray-600 hover:bg-gray-100"
            >
              +
            </button>
            <span className="text-sm text-gray-500">{product.unit}s</span>
          </div>
        </div>

        {/* Destination (groupage) — détermine le pool de consolidation */}
        {orderType === "ltl" && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("order.destination")}
            </label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="Addis-Abeba">Addis-Abeba</option>
              <option value="Dire Dawa">Dire Dawa</option>
            </select>
          </div>
        )}

        {/* Summary */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t("order.unitPrice")}</span>
            <span className="font-medium text-gray-900">${unitPrice}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-gray-600">{t("order.qty")}</span>
            <span className="font-medium text-gray-900">{qty} {product.unit}s</span>
          </div>
          <div className="mt-3 border-t border-gray-200 pt-3 flex justify-between">
            <span className="font-semibold text-gray-900">{t("order.total")}</span>
            <span className="text-xl font-bold text-brand-700">${totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Escrow notice */}
        <div className="rounded-xl bg-brand-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <p className="text-sm font-semibold text-brand-900">{t("order.escrow.title")}</p>
              <p className="mt-1 text-xs text-brand-700">{t("order.escrow.desc")}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {!user && (
          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {t("order.loginRequired")}{" "}
            <Link href="/login" className="font-semibold underline">{t("nav.login")}</Link>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !user}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading ? t("common.loading") : t("order.submit")}
        </button>
      </form>
    </div>
  );
}
