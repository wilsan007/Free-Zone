export type UserRole = "seller" | "buyer_bulk" | "buyer_small" | "transporter" | "admin";

export type VerificationStatus = "pending" | "verified" | "rejected" | "suspended";

export type OrderType = "ftl" | "ltl";

export type OrderStatus =
  | "created"
  | "escrow_funded"
  | "preparing"
  | "loaded"
  | "in_transit"
  | "delivered"
  | "funds_released"
  | "disputed"
  | "cancelled";

export type PoolStatus = "open" | "full" | "dispatched" | "closed";

export type ShipmentStatus =
  | "pending"
  | "loaded"
  | "exited_free_zone"
  | "at_border"
  | "customs_cleared"
  | "in_transit"
  | "delivered";

export type Incoterm = "EXW" | "FCA" | "DAP";

export type FreightStatus = "open" | "assigned" | "completed" | "cancelled";

export type CompatibilityClass =
  | "food"
  | "chemical_safe"
  | "chemical_haz"
  | "electronics"
  | "textile"
  | "general";

export type PoolType = "by_product" | "by_destination";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  verification_status: VerificationStatus;
  preferred_lang: "fr" | "en" | "am" | "ar";
  avatar_url: string | null;
  created_at: string;
}

export interface Company {
  id: string;
  owner_id: string;
  name: string;
  name_am: string | null;
  name_ar: string | null;
  license_number: string;
  country: string;
  city: string;
  address: string | null;
  warehouse_photos: string[] | null;
  verified_on_site: boolean;
  rating_avg: number;
  rating_count: number;
  total_volume_usd: number;
  created_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name_fr: string;
  name_en: string;
  name_am: string;
  name_ar: string;
  icon: string | null;
  compatibility_class: CompatibilityClass;
}

export interface Product {
  id: string;
  seller_id: string;
  category_id: string;
  name_fr: string;
  name_en: string;
  name_am: string;
  name_ar: string;
  description_fr: string;
  description_en: string;
  hs_code: string;
  unit: string;
  unit_weight_kg: number;
  unit_volume_m3: number;
  images: string[];
  stock_qty: number;
  reserved_qty: number;
  moq: number;
  price_ftl: number;
  price_ltl: number;
  currency: string;
  is_active: boolean;
  reliability_badge: boolean;
  compatibility_class: CompatibilityClass;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  order_type: OrderType;
  status: OrderStatus;
  qty: number;
  unit_price: number;
  total_amount: number;
  currency: string;
  incoterm: Incoterm;
  pool_id: string | null;
  shipment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsolidationPool {
  id: string;
  destination: string;
  destination_city: string;
  product_category_compatible: string;
  status: PoolStatus;
  pool_type: PoolType;
  compatibility_class: CompatibilityClass | null;
  product_id: string | null;
  max_weight_kg: number;
  max_volume_m3: number;
  current_weight_kg: number;
  current_volume_m3: number;
  fill_pct: number;
  deadline: string;
  estimated_departure: string | null;
  max_deadline_days: number;
  created_at: string;
}

export interface PoolMember {
  id: string;
  pool_id: string;
  order_id: string | null;
  product_id: string;
  buyer_id: string;
  qty: number;
  weight_kg: number;
  volume_m3: number;
  created_at: string;
}

export interface Shipment {
  id: string;
  order_id: string | null;
  pool_id: string | null;
  transporter_id: string | null;
  status: ShipmentStatus;
  origin: string;
  destination: string;
  incoterm: Incoterm;
  freight_cost: number;
  currency: string;
  tracking_enabled: boolean;
  created_at: string;
}

export interface FreightOffer {
  id: string;
  shipment_id: string;
  transporter_id: string;
  offered_price: number;
  currency: string;
  status: FreightStatus;
  created_at: string;
}

export interface ShipmentDocument {
  id: string;
  shipment_id: string;
  doc_type:
    | "commercial_invoice"
    | "packing_list"
    | "certificate_of_origin"
    | "exit_declaration"
    | "t1_transit"
    | "import_declaration"
    | "e_cmr"
    | "other";
  file_url: string;
  uploaded_by: string;
  created_at: string;
}

export interface Review {
  id: string;
  reviewer_id: string;
  reviewed_entity_id: string;
  entity_type: "seller" | "buyer" | "transporter";
  order_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Dispute {
  id: string;
  order_id: string;
  raised_by: string;
  reason: string;
  status: "open" | "under_review" | "resolved" | "escalated";
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
}

export const COMPATIBILITY_LABELS: Record<CompatibilityClass, { fr: string; en: string; icon: string; color: string }> = {
  food: { fr: "Alimentaire", en: "Food", icon: "🍚", color: "bg-green-100 text-green-700" },
  chemical_safe: { fr: "Chimique non-dangereux", en: "Chemical (safe)", icon: "🧴", color: "bg-blue-100 text-blue-700" },
  chemical_haz: { fr: "Chimique dangereux", en: "Hazardous", icon: "⚠️", color: "bg-red-100 text-red-700" },
  electronics: { fr: "Électronique", en: "Electronics", icon: "📱", color: "bg-purple-100 text-purple-700" },
  textile: { fr: "Textile", en: "Textile", icon: "👕", color: "bg-amber-100 text-amber-700" },
  general: { fr: "Général", en: "General", icon: "📦", color: "bg-gray-100 text-gray-700" },
};

export const COMPATIBLE_CLASSES: Record<CompatibilityClass, CompatibilityClass[]> = {
  food: ["food"],
  chemical_haz: ["chemical_haz"],
  chemical_safe: ["chemical_safe", "general", "electronics", "textile"],
  electronics: ["electronics", "textile", "general", "chemical_safe"],
  textile: ["textile", "electronics", "general", "chemical_safe"],
  general: ["general", "electronics", "textile", "chemical_safe"],
};

export function areCompatible(a: CompatibilityClass, b: CompatibilityClass): boolean {
  return COMPATIBLE_CLASSES[a].includes(b);
}
