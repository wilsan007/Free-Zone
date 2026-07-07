"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export default function HowItWorksView() {
  const { t } = useI18n();

  const steps = [
    { num: "1", icon: "🔍", title: t("how.step1.title"), desc: t("how.step1.desc") },
    { num: "2", icon: "🛒", title: t("how.step2.title"), desc: t("how.step2.desc") },
    { num: "3", icon: "🔒", title: t("how.step3.title"), desc: t("how.step3.desc") },
    { num: "4", icon: "📦", title: t("how.step4.title"), desc: t("how.step4.desc") },
    { num: "5", icon: "🚚", title: t("how.step5.title"), desc: t("how.step5.desc") },
    { num: "6", icon: "✓", title: t("how.step6.title"), desc: t("how.step6.desc") },
  ];

  const faqs = [
    { q: t("how.faq1.q"), a: t("how.faq1.a") },
    { q: t("how.faq2.q"), a: t("how.faq2.a") },
    { q: t("how.faq3.q"), a: t("how.faq3.a") },
    { q: t("how.faq4.q"), a: t("how.faq4.a") },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-700 to-brand-950 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold sm:text-4xl">{t("how.title")}</h1>
          <p className="mt-4 text-lg text-brand-100">{t("how.subtitle")}</p>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.num}
              className="relative rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl">
                  {step.icon}
                </div>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {step.num}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Groupage explanation */}
      <section className="bg-sand-100 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t("how.groupage.title")}</h2>
              <p className="mt-4 text-base text-gray-600">{t("how.groupage.desc")}</p>
              <ul className="mt-6 space-y-3">
                {[t("how.groupage.b1"), t("how.groupage.b2"), t("how.groupage.b3")].map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs text-white">✓</span>
                    <span className="text-sm text-gray-700">{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/groupage"
                className="mt-6 inline-block rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                {t("home.groupage.cta")}
              </Link>
            </div>
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <div className="space-y-4">
                {[
                  { label: "Acheteur A", qty: "2 cartons", pct: 25, color: "bg-amber-400" },
                  { label: "Acheteur B", qty: "3 cartons", pct: 35, color: "bg-brand-500" },
                  { label: "Acheteur C", qty: "2 cartons", pct: 25, color: "bg-green-500" },
                  { label: "Reste", qty: "1 carton", pct: 15, color: "bg-gray-200" },
                ].map((s, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">{s.label}</span>
                      <span className="text-gray-500">{s.qty}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-center text-sm font-semibold text-brand-700">
                    {t("how.groupage.trigger")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-gray-900">{t("how.faq.title")}</h2>
        <div className="mt-8 space-y-4">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="group rounded-xl border border-gray-200 bg-white p-4"
            >
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-gray-900">
                {faq.q}
                <span className="ml-2 text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-3 text-sm text-gray-600">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-12 text-center text-white sm:px-12">
          <h2 className="text-2xl font-bold sm:text-3xl">{t("home.cta.title")}</h2>
          <p className="mt-3 text-base text-brand-100">{t("home.cta.desc")}</p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-xl bg-white px-8 py-3 text-sm font-semibold text-brand-700 shadow-lg hover:bg-brand-50 transition-colors"
          >
            {t("home.cta.button")}
          </Link>
        </div>
      </section>
    </div>
  );
}
