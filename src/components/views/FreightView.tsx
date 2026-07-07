"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export default function FreightView() {
  const { t } = useI18n();

  const features = [
    { icon: "🚛", title: t("freight.feature1.title"), desc: t("freight.feature1.desc") },
    { icon: "📍", title: t("freight.feature2.title"), desc: t("freight.feature2.desc") },
    { icon: "📄", title: t("freight.feature3.title"), desc: t("freight.feature3.desc") },
    { icon: "🔒", title: t("freight.feature4.title"), desc: t("freight.feature4.desc") },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-800 to-gray-950 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="text-5xl">🚛</div>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{t("freight.title")}</h1>
          <p className="mt-4 text-lg text-gray-300">{t("freight.subtitle")}</p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl">{f.icon}</div>
              <h3 className="mt-4 text-base font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="bg-sand-100 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">{t("freight.process.title")}</h2>
          <div className="mt-10 space-y-6">
            {[
              { num: "1", title: t("freight.process.step1.title"), desc: t("freight.process.step1.desc") },
              { num: "2", title: t("freight.process.step2.title"), desc: t("freight.process.step2.desc") },
              { num: "3", title: t("freight.process.step3.title"), desc: t("freight.process.step3.desc") },
              { num: "4", title: t("freight.process.step4.title"), desc: t("freight.process.step4.desc") },
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coming soon notice */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center sm:p-12">
          <div className="text-4xl">�</div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">{t("freight.comingSoon")}</h2>
          <p className="mt-2 text-sm text-gray-500">{t("freight.comingSoonDesc")}</p>
          <Link
            href="/how-it-works"
            className="mt-6 inline-block rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            {t("nav.howItWorks")}
          </Link>
        </div>
      </section>
    </div>
  );
}
