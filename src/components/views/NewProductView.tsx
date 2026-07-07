"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { COMPATIBILITY_LABELS, type CompatibilityClass } from "@/lib/types/database";

export default function NewProductView({
  categories,
}: {
  categories: { id: string; name_fr: string; slug: string }[];
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const [form, setForm] = useState({
    name_fr: "",
    name_en: "",
    description_fr: "",
    description_en: "",
    hs_code: "",
    unit: "carton",
    unit_weight_kg: 1,
    unit_volume_m3: 0.01,
    stock_qty: 100,
    moq: 1,
    price_ftl: 10,
    price_ltl: 15,
    category_id: categories[0]?.id ?? "",
    compatibility_class: "general" as CompatibilityClass,
  });

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const uploadFiles = async (files: FileList) => {
    if (!user) return;
    setUploading(true);
    setError(null);

    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        setError(`${file.name} n'est pas une image`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`${file.name} dépasse 5MB`);
        continue;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (uploadError) {
        setError(uploadError.message);
      } else {
        const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
        newUrls.push(data.publicUrl);
      }
    }

    if (newUrls.length > 0) {
      setImages((prev) => [...prev, ...newUrls]);
    }
    setUploading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const addImageUrl = () => {
    if (imageUrl.trim()) {
      setImages((prev) => [...prev, imageUrl.trim()]);
      setImageUrl("");
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(true);

    const profile = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (profile.error || !profile.data) {
      setError("Profil introuvable. Veuillez vous reconnecter.");
      setLoading(false);
      return;
    }

    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", profile.data.id)
      .single();

    if (!company) {
      setError("Aucune entreprise trouvée. Veuillez créer votre entreprise d'abord.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("products").insert({
      seller_id: company.id,
      category_id: form.category_id,
      name_fr: form.name_fr,
      name_en: form.name_en || form.name_fr,
      name_am: form.name_fr,
      name_ar: form.name_fr,
      description_fr: form.description_fr,
      description_en: form.description_en || form.description_fr,
      hs_code: form.hs_code,
      unit: form.unit,
      unit_weight_kg: Number(form.unit_weight_kg),
      unit_volume_m3: Number(form.unit_volume_m3),
      images: images.length > 0 ? images : ["https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800"],
      stock_qty: Number(form.stock_qty),
      reserved_qty: 0,
      moq: Number(form.moq),
      price_ftl: Number(form.price_ftl),
      price_ltl: Number(form.price_ltl),
      currency: "USD",
      is_active: true,
      reliability_badge: false,
      compatibility_class: form.compatibility_class,
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
    } else {
      router.push("/dashboard");
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-lg text-gray-400">{t("order.loginRequired")}</p>
      </div>
    );
  }

  const inputClass = "mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("dashboard.addProduct")}</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Images section */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Images du produit</label>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-1 cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
              dragOver ? "border-brand-500 bg-brand-50" : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="text-3xl">📤</div>
            <p className="mt-2 text-sm font-medium text-gray-700">
              {uploading ? "Upload en cours..." : "Glissez vos images ici ou cliquez pour parcourir"}
            </p>
            <p className="mt-1 text-xs text-gray-400">JPG, PNG, WEBP — 5MB max par image</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* URL input */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImageUrl(); } }}
              placeholder="Ou collez une URL d'image..."
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="button"
              onClick={addImageUrl}
              className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              + URL
            </button>
          </div>

          {/* Image previews */}
          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((url, index) => (
                <div key={index} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200">
                  <Image
                    src={url}
                    alt={`Product image ${index + 1}`}
                    fill
                    sizes="120px"
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    ✕
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Principale
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">{t("dashboard.productName")} (FR)</label>
          <input type="text" required value={form.name_fr} onChange={(e) => handleChange("name_fr", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("dashboard.productName")} (EN)</label>
          <input type="text" value={form.name_en} onChange={(e) => handleChange("name_en", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("product.description")} (FR)</label>
          <textarea required value={form.description_fr} onChange={(e) => handleChange("description_fr", e.target.value)} rows={3} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">{t("product.hsCode")}</label>
            <input type="text" value={form.hs_code} onChange={(e) => handleChange("hs_code", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t("product.unit")}</label>
            <select value={form.unit} onChange={(e) => handleChange("unit", e.target.value)} className={inputClass}>
              <option value="carton">Carton</option>
              <option value="palette">Palette</option>
              <option value="sac">Sac</option>
              <option value="bundle">Bundle</option>
              <option value="piece">Piece</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("catalog.filter.category")}</label>
          <select value={form.category_id} onChange={(e) => handleChange("category_id", e.target.value)} className={inputClass}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name_fr}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("product.compatibility")}</label>
          <select
            value={form.compatibility_class}
            onChange={(e) => handleChange("compatibility_class", e.target.value)}
            className={inputClass}
          >
            {(Object.keys(COMPATIBILITY_LABELS) as CompatibilityClass[]).map((cls) => (
              <option key={cls} value={cls}>
                {COMPATIBILITY_LABELS[cls].icon} {COMPATIBILITY_LABELS[cls].fr}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            {t("product.compatibilityHint")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">{t("product.weight")} (kg)</label>
            <input type="number" step="0.001" value={form.unit_weight_kg} onChange={(e) => handleChange("unit_weight_kg", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t("product.volume")} (m³)</label>
            <input type="number" step="0.0001" value={form.unit_volume_m3} onChange={(e) => handleChange("unit_volume_m3", e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">{t("dashboard.stock")}</label>
            <input type="number" required value={form.stock_qty} onChange={(e) => handleChange("stock_qty", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t("product.moq")}</label>
            <input type="number" required value={form.moq} onChange={(e) => handleChange("moq", e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">{t("product.priceFtl")} ($)</label>
            <input type="number" step="0.01" required value={form.price_ftl} onChange={(e) => handleChange("price_ftl", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t("product.priceLtl")} ($)</label>
            <input type="number" step="0.01" required value={form.price_ltl} onChange={(e) => handleChange("price_ltl", e.target.value)} className={inputClass} />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading ? t("common.loading") : t("dashboard.addProduct")}
        </button>
      </form>
    </div>
  );
}
