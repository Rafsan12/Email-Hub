"use client";

import React, { useState } from "react";
import { X, Send, RefreshCw, Mail } from "lucide-react";

interface Account {
  id: string;
  name: string;
  email: string;
}

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onEmailSent: () => void;
}

export default function ComposeModal({
  isOpen,
  onClose,
  accounts,
  onEmailSent,
}: ComposeModalProps) {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || "");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount) {
      setError("Please select a sending account");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: currentAccount.id,
          to,
          subject,
          bodyText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setTo("");
      setSubject("");
      setBodyText("");
      onEmailSent();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-[#0f1422] border border-white/10 shadow-2xl shadow-black/90 overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#121727]/90 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Mail className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-white">Compose New Email</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSend} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* From Account Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Send From Account:
            </label>
            <select
              value={selectedAccountId || accounts[0]?.id}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#121727] px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} &lt;{acc.email}&gt;
                </option>
              ))}
            </select>
          </div>

          {/* To Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              To Recipient:
            </label>
            <input
              type="email"
              required
              placeholder="e.g. client@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#121727] px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>

          {/* Subject Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Subject:
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Project Update or Discussion"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#121727] px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>

          {/* Body Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Message:
            </label>
            <textarea
              rows={8}
              required
              placeholder="Write your email here..."
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#121727] p-3.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !to || !subject || !bodyText}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 transition"
            >
              {sending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send Email
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
