// ============================================================
// FreeZone Market — Détection de fuite de coordonnées
// Empêche l'échange de contacts directs dans la messagerie tant
// que la transaction n'est pas sécurisée (escrow payé) : c'est le
// mécanisme central anti-contournement de la plateforme.
// ============================================================

export type LeakReason =
  | "phone"
  | "email"
  | "messaging_app"
  | "bank"
  | "url";

const PATTERNS: { reason: LeakReason; re: RegExp }[] = [
  // Numéros de téléphone : +253 (Djibouti), +251 (Éthiopie), et toute
  // séquence de 8+ chiffres éventuellement espacés/pointés/tiretés.
  { reason: "phone", re: /(\+?\s?\d[\s.\-()]?){8,}/g },
  // E-mails
  { reason: "email", re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  // Apps de messagerie hors plateforme (multi-langues, insensible à la casse)
  {
    reason: "messaging_app",
    re: /\b(whats?app|wa\.me|telegram|t\.me|viber|imo|signal|wechat|ዋትሳፕ|ቴሌግራም|واتساب|تيليجرام|تلغرام)\b/gi,
  },
  // Références bancaires : IBAN, SWIFT/BIC, mots-clés compte
  {
    reason: "bank",
    re: /\b([A-Z]{2}\d{2}[A-Z0-9]{10,30}|[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?|iban|swift|compte\s+bancaire|bank\s+account|የባንክ\s?ሂሳብ|حساب\s?بنكي)\b/gi,
  },
  // Liens externes (hors freezonemarket)
  {
    reason: "url",
    re: /\bhttps?:\/\/(?!(www\.)?freezonemarket\.)[^\s]+/gi,
  },
];

const MASK = "•••";

/** Détecte les tentatives de partage de coordonnées. */
export function detectLeaks(text: string): LeakReason[] {
  const reasons = new Set<LeakReason>();
  for (const { reason, re } of PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text)) reasons.add(reason);
  }
  return Array.from(reasons);
}

/** Remplace les coordonnées détectées par un masque. */
export function maskLeaks(text: string): string {
  let out = text;
  for (const { re } of PATTERNS) {
    re.lastIndex = 0;
    out = out.replace(re, MASK);
  }
  return out;
}
