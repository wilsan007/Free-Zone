"use client";

import { useI18n } from "@/lib/i18n/context";

export default function FreightView() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 p-8 text-white">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {t("nav.freight")}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-gray-300">
          Bourse de fret — matching automatique camion ↔ cargaison. Tracking GPS, e-CMR, paiement transporteur séquestré.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-12 text-center">
        <div className="text-4xl">🚛</div>
        <p className="mt-4 text-lg font-semibold text-gray-700">
          Bourse de fret — Bientôt disponible
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Les transporteurs vérifiés pourront consulter les offres de fret et faire des offres en temps réel.
        </p>
      </div>
    </div>
  );
}
