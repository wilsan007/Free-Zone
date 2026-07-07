"use client";

// ============================================================
// Messagerie interne (RFQ / négociation)
// Le masquage des coordonnées est appliqué CÔTÉ SERVEUR (RPC
// send_message + vue thread_messages) : un client modifié ne peut
// ni envoyer un message non filtré, ni lire le corps original de la
// contrepartie tant que l'escrow n'est pas payé. Le module antileak
// côté client ne sert qu'à avertir l'utilisateur immédiatement.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { detectLeaks } from "@/lib/antileak";

type ThreadMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  flagged: boolean;
  created_at: string;
};

export default function MessageThread({
  productId,
}: {
  productId: string;
  sellerCompanyId?: string;
}) {
  const { t } = useI18n();
  const { user, profile } = useAuth();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [contactUnlocked, setContactUnlocked] = useState(false);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [warning, setWarning] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(
    async (convId: string) => {
      const { data, error } = await supabase
        .from("thread_messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) {
        setUnavailable(true);
        return;
      }
      setMessages((data as ThreadMessage[]) ?? []);
    },
    [supabase]
  );

  const openConversation = useCallback(async () => {
    if (!profile) return;
    const { data: convId, error } = await supabase.rpc("open_conversation", {
      p_product_id: productId,
    });
    if (error || !convId) {
      setUnavailable(true);
      return;
    }
    setConversationId(convId as string);
    await loadMessages(convId as string);

    const { data: unlocked } = await supabase.rpc("contact_unlocked", {
      conv_id: convId as string,
    });
    setContactUnlocked(Boolean(unlocked));
  }, [supabase, productId, profile, loadMessages]);

  useEffect(() => {
    if (open && !conversationId) openConversation();
  }, [open, conversationId, openConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !conversationId || sending) return;
    setSending(true);
    // Avertissement immédiat côté client ; le serveur re-vérifie et fait foi
    setWarning(detectLeaks(body).length > 0);

    const { error } = await supabase.rpc("send_message", {
      p_conversation_id: conversationId,
      p_body: body,
    });
    if (!error) {
      setDraft("");
      await loadMessages(conversationId);
    }
    setSending(false);
  };

  if (!user) {
    return (
      <Link
        href="/login"
        className="mt-3 block w-full rounded-lg border border-brand-300 px-4 py-2.5 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
      >
        💬 {t("rfq.loginToAsk")}
      </Link>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-lg border border-brand-300 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
      >
        💬 {t("rfq.open")}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="text-sm font-bold text-gray-900">💬 {t("rfq.title")}</p>
        <p className="mt-0.5 text-xs text-gray-500">
          🔒 {contactUnlocked ? t("rfq.contactUnlocked") : t("rfq.maskNotice")}
        </p>
      </div>

      {unavailable ? (
        <p className="px-4 py-6 text-center text-sm text-gray-400">
          {t("rfq.unavailable")}
        </p>
      ) : (
        <>
          <div className="max-h-72 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400">{t("rfq.empty")}</p>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === profile?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                      mine ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    {m.flagged && mine && (
                      <p className="mt-1 text-[11px] opacity-80">🚫 {t("rfq.flaggedMine")}</p>
                    )}
                    <p className={`mt-0.5 text-[10px] ${mine ? "text-brand-100" : "text-gray-400"}`}>
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {warning && (
            <p className="mx-4 mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠️ {t("rfq.leakWarning")}
            </p>
          )}

          <div className="flex gap-2 border-t border-gray-100 p-3">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={t("rfq.placeholder")}
              maxLength={2000}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              aria-label={t("rfq.placeholder")}
            />
            <button
              onClick={send}
              disabled={sending || !draft.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {sending ? "…" : t("rfq.send")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
