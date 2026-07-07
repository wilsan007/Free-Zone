"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="mt-20 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-white font-bold text-xs">
                FZ
              </div>
              <span className="text-base font-bold text-gray-900">
                FreeZone<span className="text-brand-600"> Market</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-500 max-w-xs">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t("footer.about")}</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/how-it-works" className="text-sm text-gray-500 hover:text-brand-600">
                  {t("nav.howItWorks")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-500 hover:text-brand-600">
                  {t("footer.contact")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t("footer.help")}</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/terms" className="text-sm text-gray-500 hover:text-brand-600">
                  {t("footer.terms")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-gray-500 hover:text-brand-600">
                  {t("footer.privacy")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t("nav.catalog")}</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/catalog?category=electronics" className="text-sm text-gray-500 hover:text-brand-600">
                  {t("nav.catalog")}
                </Link>
              </li>
              <li>
                <Link href="/groupage" className="text-sm text-gray-500 hover:text-brand-600">
                  {t("nav.groupage")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-100 pt-6 text-center">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} FreeZone Market. {t("footer.rights")}.
          </p>
        </div>
      </div>
    </footer>
  );
}
