"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import type { Product, Order } from "@/lib/types/database";

export default function DashboardView() {
  const { t } = useI18n();
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "products" | "orders">("overview");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (!prof) {
        setLoading(false);
        return;
      }

      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", prof.id)
        .single();

      if (!company) {
        setLoading(false);
        return;
      }

      const [productsRes, ordersRes] = await Promise.all([
        supabase.from("products").select("*").eq("seller_id", company.id).order("created_at", { ascending: false }),
        supabase.from("orders").select("*").eq("seller_id", company.id).order("created_at", { ascending: false }),
      ]);

      if (productsRes.data) setProducts(productsRes.data as Product[]);
      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
      setLoading(false);
    };

    fetchData();
  }, [user, supabase]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-sm text-gray-400">{t("common.loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <p className="text-lg text-gray-400">{t("order.loginRequired")}</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-brand-600">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  const totalStock = products.reduce((sum, p) => sum + p.stock_qty, 0);
  const totalReserved = products.reduce((sum, p) => sum + p.reserved_qty, 0);
  const totalRevenue = orders
    .filter((o) => o.status === "funds_released")
    .reduce((sum, o) => sum + o.total_amount, 0);
  const pendingOrders = orders.filter(
    (o) => o.status !== "funds_released" && o.status !== "cancelled"
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("nav.dashboard")}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("auth.welcome")}, {profile?.full_name || user.email}
          </p>
        </div>
        {profile?.role === "seller" && (
          <Link
            href="/dashboard/new-product"
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            + {t("dashboard.addProduct")}
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-gray-200">
        {[
          { key: "overview" as const, label: t("dashboard.overview") },
          { key: "products" as const, label: t("dashboard.products") },
          { key: "orders" as const, label: t("dashboard.orders") },
        ].map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === tabItem.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-xl">📦</div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{products.length}</p>
            <p className="text-sm text-gray-500">{t("dashboard.totalProducts")}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-xl">📊</div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{totalStock.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{t("dashboard.totalStock")}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-xl">⏳</div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{pendingOrders}</p>
            <p className="text-sm text-gray-500">{t("dashboard.pendingOrders")}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-xl">💰</div>
            <p className="mt-3 text-2xl font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{t("dashboard.totalRevenue")}</p>
          </div>
        </div>
      )}

      {/* Products */}
      {tab === "products" && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("dashboard.productName")}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{t("dashboard.stock")}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{t("dashboard.reserved")}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{t("product.priceFtl")}</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">{t("dashboard.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {products.length > 0 ? (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name_fr}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{p.stock_qty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{p.reserved_qty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-700">${p.price_ftl}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {p.is_active ? t("dashboard.active") : t("dashboard.inactive")}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    {t("dashboard.noProducts")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Orders */}
      {tab === "orders" && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("order.type")}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{t("order.qty")}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{t("order.total")}</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">{t("dashboard.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {orders.length > 0 ? (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/orders/${o.id}`} className="font-medium text-brand-600 hover:underline">
                        #{o.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 uppercase text-gray-700">{o.order_type}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{o.qty}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">${o.total_amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {t(`order.status.${o.status}` as string)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    {t("dashboard.noOrders")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
