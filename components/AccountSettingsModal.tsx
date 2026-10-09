"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw, Mail, ShieldAlert } from "lucide-react";

interface Account {
  id: string;
  name: string;
  email: string;
  type: string;
  lastSyncedAt?: string | null;
  _count?: { emails: number };
}

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onRefreshAccounts: () => void;
}

export default function AccountSettingsModal({
  isOpen,
  onClose,
  accounts,
  onRefreshAccounts,
}: AccountSettingsModalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [accountType, setAccountType] = useState<"GMAIL" | "WEBMAIL">("GMAIL");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [imapHost, setImapHost] = useState("imap.gmail.com");
  const [imapPort, setImapPort] = useState(993);
  const [imapUser, setImapUser] = useState("");
  const [imapPass, setImapPass] = useState("");
  const [imapSecure, setImapSecure] = useState(true);

  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(true);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTypeChange = (type: "GMAIL" | "WEBMAIL") => {
    setAccountType(type);
    if (type === "GMAIL") {
      setImapHost("imap.gmail.com");
      setImapPort(993);
      setSmtpHost("smtp.gmail.com");
      setSmtpPort(465);
    } else {
      setImapHost("mail.yourdomain.com");
      setImapPort(993);
      setSmtpHost("mail.yourdomain.com");
      setSmtpPort(465);
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setImapUser(val);
    setSmtpUser(val);
    if (accountType === "WEBMAIL" && val.includes("@")) {
      const domain = val.split("@")[1];
      if (domain) {
        setImapHost(`mail.${domain}`);
        setSmtpHost(`mail.${domain}`);
      }
    }
  };

  const handlePasswordChange = (val: string) => {
    setImapPass(val);
    setSmtpPass(val);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await fetch("/api/accounts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imapHost,
          imapPort,
          imapUser,
          imapPass,
          imapSecure,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          smtpSecure,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTestResult({ success: false, message: data.error || "Connection failed" });
      } else {
        setTestResult({ success: true, message: "Connection successful! IMAP and SMTP are working." });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Failed to test connection" });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const displayName = name.trim();

      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: displayName,
          email,
          type: accountType,
          imapHost,
          imapPort,
          imapUser,
          imapPass,
          imapSecure,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          smtpSecure,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save account");
      }
      setShowAddForm(false);
      setName("");
      setEmail("");
      setImapPass("");
      setSmtpPass("");
      setTestResult(null);
      onRefreshAccounts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (id: string, accEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${accEmail}? All local cached emails for this account will be removed.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/accounts?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        onRefreshAccounts();
      }
    } catch (err) {
      alert("Failed to delete account");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md text-slate-100">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-[#0f1422] border border-white/10 shadow-2xl shadow-black/90 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#121727]/90 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Mail className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-white">Email Accounts Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Accounts List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Connected Accounts ({accounts.length})
              </h3>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 hover:from-indigo-400 hover:to-purple-500 transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Account
                </button>
              )}
            </div>

            {accounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center bg-[#121727]/50">
                <Mail className="mx-auto h-8 w-8 text-slate-500 mb-2" />
                <p className="text-sm font-medium text-slate-300">No accounts connected yet</p>
                <p className="text-xs text-slate-400 mt-1">Connect your Gmail or Webmail account to start tracking.</p>
                {!showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white hover:from-indigo-400 hover:to-purple-500"
                  >
                    <Plus className="h-4 w-4" /> Connect Your First Account
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#121727]/80 p-4 shadow-sm hover:border-white/20 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{acc.name}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            acc.type === "GMAIL"
                              ? "bg-red-500/15 text-red-300 border-red-500/30"
                              : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                          }`}
                        >
                          {acc.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{acc.email}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Cached emails: {acc._count?.emails ?? 0} &bull; Last synced:{" "}
                        {acc.lastSyncedAt ? new Date(acc.lastSyncedAt).toLocaleString() : "Never"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteAccount(acc.id, acc.email)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300 transition"
                      title="Remove Account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Account Form */}
          {showAddForm && (
            <form onSubmit={handleSaveAccount} className="rounded-2xl border border-white/10 bg-[#121727]/90 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h4 className="font-semibold text-white text-sm">Connect New Account</h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTypeChange("GMAIL")}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold border transition ${
                    accountType === "GMAIL"
                      ? "bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-sm"
                      : "bg-[#0d121f] border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="font-bold">G</span> Gmail
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("WEBMAIL")}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold border transition ${
                    accountType === "WEBMAIL"
                      ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-sm"
                      : "bg-[#0d121f] border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" /> Webmail (cPanel / Custom)
                </button>
              </div>

              {accountType === "GMAIL" && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs text-amber-300 flex gap-2.5">
                  <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-200">Gmail Setup Note:</span> Use a 16-character{" "}
                    <strong>Google App Password</strong> (not your normal password). Generate one at{" "}
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-medium text-amber-200 hover:text-white"
                    >
                      myaccount.google.com/apppasswords
                    </a>.
                  </div>
                </div>
              )}


              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Account Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Work Gmail or Office Webmail"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0d121f] px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. info@gmail.com"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0d121f] px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {accountType === "GMAIL" ? "Google App Password" : "Email Password"}
                </label>
                <input
                  type="password"
                  required
                  placeholder={accountType === "GMAIL" ? "16-character app password" : "Your webmail password"}
                  value={imapPass}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0d121f] px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Advanced server settings for Webmail */}
              {accountType === "WEBMAIL" && (
                <div className="space-y-3 pt-2 border-t border-white/[0.08]">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Server Settings</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-0.5">IMAP Host (Incoming)</label>
                      <input
                        type="text"
                        required
                        value={imapHost}
                        onChange={(e) => setImapHost(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#0d121f] px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-0.5">IMAP Port</label>
                      <input
                        type="number"
                        required
                        value={imapPort}
                        onChange={(e) => setImapPort(Number(e.target.value))}
                        className="w-full rounded-xl border border-white/10 bg-[#0d121f] px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-0.5">SMTP Host (Outgoing)</label>
                      <input
                        type="text"
                        required
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#0d121f] px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-0.5">SMTP Port</label>
                      <input
                        type="number"
                        required
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value))}
                        className="w-full rounded-xl border border-white/10 bg-[#0d121f] px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Test Connection Results */}
              {testResult && (
                <div
                  className={`flex items-center gap-2 rounded-xl p-3 text-xs ${
                    testResult.success
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  disabled={testing || !email || !imapPass}
                  onClick={handleTestConnection}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#161d31] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-[#1e2742] disabled:opacity-50 transition shadow-sm"
                >
                  {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400" /> : null}
                  Test Connection
                </button>
                <button
                  type="submit"
                  disabled={saving || !email || !imapPass}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 transition"
                >
                  {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                  Save & Connect
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
