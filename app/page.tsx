"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Search,
  RefreshCw,
  Plus,
  Settings,
  Filter,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  Sparkles,
  Layers,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import StatsCards from "@/components/StatsCards";
import AccountSettingsModal from "@/components/AccountSettingsModal";
import ComposeModal from "@/components/ComposeModal";
import EmailDetailModal from "@/components/EmailDetailModal";

interface Account {
  id: string;
  name: string;
  email: string;
  type: string;
  lastSyncedAt?: string | null;
  _count?: { emails: number };
}

interface EmailItem {
  id: string;
  accountId: string;
  account: { id: string; name: string; email: string };
  messageId: string | null;
  inReplyTo: string | null;
  fromAddress: string;
  fromName: string | null;
  toAddress: string;
  toName: string | null;
  subject: string;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  date: string;
  folder: string;
  isRead: boolean;
  isReplied: boolean;
  repliedAt: string | null;
  tag: string;
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [stats, setStats] = useState({
    totalInbox: 0,
    needsReplyCount: 0,
    repliedCount: 0,
    sentCount: 0,
  });

  // Filters
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // "needs_reply" | "replied" | "all"
  const [filterFolder, setFilterFolder] = useState("ALL"); // "INBOX" | "SENT" | "ALL"
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  const [loadingEmails, setLoadingEmails] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (res.ok) {
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    }
  }, []);

  // Fetch emails
  const fetchEmails = useCallback(async () => {
    setLoadingEmails(true);
    try {
      const params = new URLSearchParams();
      if (selectedAccountId !== "all") params.append("accountId", selectedAccountId);
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterFolder !== "ALL") params.append("folder", filterFolder);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/emails?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setEmails(data.emails || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to fetch emails:", err);
    } finally {
      setLoadingEmails(false);
    }
  }, [selectedAccountId, filterStatus, filterFolder, searchQuery]);

  // Initial load
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Handle Sync (supports silent background sync)
  const handleSync = useCallback(
    async (silent: boolean = false) => {
      if (accounts.length === 0) {
        if (!silent) setIsAccountModalOpen(true);
        return;
      }

      setSyncing(true);
      if (!silent) {
        setSyncMessage("Connecting to mail servers & checking for new emails and replies...");
      }

      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: selectedAccountId !== "all" ? selectedAccountId : undefined,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          const errorResult = (data.results || []).find((r: any) => r.error);
          if (errorResult) {
            setSyncMessage(`Sync warning for ${errorResult.accountEmail}: ${errorResult.error}`);
          } else {
            const totalFetched = (data.results || []).reduce(
              (acc: number, r: any) => acc + (r.inboxCount || 0) + (r.sentCount || 0),
              0
            );
            const repliesFound = (data.results || []).reduce(
              (acc: number, r: any) => acc + (r.repliesDetected || 0),
              0
            );
            setLastSyncedAt(new Date());
            if (!silent) {
              setSyncMessage(`Sync complete! Loaded ${totalFetched} messages (${repliesFound} replies linked).`);
              setTimeout(() => setSyncMessage(null), 5000);
            }
          }
          await fetchAccounts();
          await fetchEmails();
        } else {
          setSyncMessage(`Sync error: ${data.error || "Failed to sync"}`);
        }
      } catch (err: any) {
        setSyncMessage(`Sync failed: ${err.message}`);
      } finally {
        setSyncing(false);
      }
    },
    [accounts.length, selectedAccountId, fetchAccounts, fetchEmails]
  );

  // Auto-sync every 10 minutes (600,000 ms)
  useEffect(() => {
    if (accounts.length === 0) return;

    const TEN_MINUTES_MS = 10 * 60 * 1000;
    const interval = setInterval(() => {
      console.log("[AutoSync] Triggering 10-minute automatic background sync...");
      handleSync(true); // silent background sync
    }, TEN_MINUTES_MS);

    return () => clearInterval(interval);
  }, [accounts.length, handleSync]);

  const handleStatsFilterChange = (type: "status" | "folder", value: string) => {
    if (type === "status") setFilterStatus(value);
    if (type === "folder") setFilterFolder(value);
  };

  const currentSelectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="min-h-screen bg-[#0a0e17] text-slate-100 flex flex-col font-sans">
      {/* Top Glassmorphic Navigation */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0c101c]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <Mail className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">Email Hub</h1>
                <span className="rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/30">
                  Aesthetic Tracker
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Smart Reply Detection & Multi-Inbox Sync</p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Account Selector Dropdown */}
            <div className="relative">
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="appearance-none rounded-xl border border-white/10 bg-[#121727] py-2 pl-3.5 pr-8 text-xs font-semibold text-slate-200 shadow-sm hover:border-white/20 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer transition"
              >
                <option value="all">🌐 All Accounts ({accounts.length})</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    📧 {a.name} ({a.email})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Auto-Sync 10m Status Pill */}
            <div
              className="hidden md:flex items-center gap-1.5 rounded-xl border border-white/5 bg-[#121727]/80 px-2.5 py-1.5 text-[11px] text-slate-300 shadow-sm"
              title="Automatically syncs in the background every 10 minutes"
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20 animate-pulse" />
              <span className="font-medium">Auto: 10m</span>
              {lastSyncedAt && (
                <span className="text-slate-400">
                  &bull; {format(lastSyncedAt, "h:mm a")}
                </span>
              )}
            </div>

            {/* Sync Button */}
            <button
              onClick={() => handleSync(false)}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#121727] px-3.5 py-2 text-xs font-semibold text-slate-200 shadow-sm hover:bg-[#182035] hover:border-white/20 disabled:opacity-50 transition"
              title="Sync latest emails & reply statuses"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-indigo-400" : "text-slate-400"}`} />
              <span>{syncing ? "Syncing..." : "Sync Now"}</span>
            </button>

            {/* Compose Button */}
            <button
              onClick={() => {
                if (accounts.length === 0) {
                  setIsAccountModalOpen(true);
                } else {
                  setIsComposeModalOpen(true);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-purple-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Compose</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="rounded-xl border border-white/10 bg-[#121727] p-2 text-slate-400 hover:text-white hover:bg-[#182035] transition shadow-sm"
              title="Account Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Sync Notification Banner */}
        {syncMessage && (
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/40 backdrop-blur-md p-3.5 text-xs text-indigo-200 flex items-center justify-between shadow-lg shadow-indigo-950/50">
            <div className="flex items-center gap-2.5">
              <RefreshCw className={`h-4 w-4 text-indigo-400 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncMessage}</span>
            </div>
            {!syncing && (
              <button
                onClick={() => setSyncMessage(null)}
                className="text-indigo-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* 4 Core Metric Cards */}
        <StatsCards
          stats={stats}
          activeFilter={{ status: filterStatus, folder: filterFolder }}
          onFilterChange={handleStatsFilterChange}
        />

        {/* Filter Bar & Search */}
        <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#111726]/80 backdrop-blur-md p-3.5 shadow-md md:flex-row md:items-center md:justify-between">
          {/* Status & Folder Controls */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-slate-400" /> Filter:
            </span>

            {/* Status pills */}
            <button
              onClick={() => setFilterStatus("all")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filterStatus === "all"
                  ? "bg-white text-slate-900 shadow-md font-bold"
                  : "bg-white/[0.05] text-slate-300 hover:bg-white/10"
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setFilterStatus("needs_reply")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filterStatus === "needs_reply"
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30 font-bold"
                  : "bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20"
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5" /> Needs Reply
            </button>
            <button
              onClick={() => setFilterStatus("replied")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filterStatus === "replied"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 font-bold"
                  : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Replied
            </button>

            <span className="mx-2 text-white/10">|</span>

            {/* Folder pills */}
            <button
              onClick={() => setFilterFolder("ALL")}
              className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                filterFolder === "ALL"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white/[0.04] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08]"
              }`}
            >
              All Mail
            </button>
            <button
              onClick={() => setFilterFolder("INBOX")}
              className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                filterFolder === "INBOX"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                  : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20"
              }`}
            >
              <Inbox className="h-3 w-3" /> Inbox
            </button>
            <button
              onClick={() => setFilterFolder("SENT")}
              className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                filterFolder === "SENT"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                  : "bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20"
              }`}
            >
              <Send className="h-3 w-3" /> Sent
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search sender, recipient, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0d121f] pl-10 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:bg-[#121827] focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition"
            />
          </div>
        </div>

        {/* Selected Account Indicator Banner */}
        {selectedAccountId !== "all" && currentSelectedAccount ? (
          <div className="flex items-center justify-between rounded-2xl border border-indigo-500/30 bg-indigo-950/30 backdrop-blur-md px-4 py-2.5 text-xs text-indigo-200 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
              <span>
                Showing only emails for: <strong className="text-white">{currentSelectedAccount.name}</strong> ({currentSelectedAccount.email})
              </span>
            </div>
            <button
              onClick={() => setSelectedAccountId("all")}
              className="font-semibold text-indigo-400 hover:text-white underline text-xs cursor-pointer transition"
            >
              Show All Accounts
            </button>
          </div>
        ) : accounts.length > 1 ? (
          <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#111726]/50 px-4 py-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-slate-400" /> Showing latest emails across all {accounts.length} connected accounts
            </span>
          </div>
        ) : null}

        {/* Email Items List */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#111726]/90 backdrop-blur-md shadow-xl overflow-hidden">
          {loadingEmails ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <RefreshCw className="h-7 w-7 animate-spin text-indigo-400" />
              <span className="text-xs text-slate-400">Loading inbox conversations...</span>
            </div>
          ) : emails.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.08] text-slate-500">
                <Mail className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold text-white">
                {filterStatus !== "all" || filterFolder !== "ALL"
                  ? "No emails found for this filter"
                  : "No emails loaded yet"}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                {accounts.length === 0
                  ? "Click 'Connect Email Account' to link your Gmail or Webmail account."
                  : filterStatus !== "all" || filterFolder !== "ALL"
                  ? `You are currently filtering by ${filterStatus !== "all" ? `Status: [${filterStatus}]` : ""} ${filterFolder !== "ALL" ? `Folder: [${filterFolder}]` : ""}. Click below to show all emails.`
                  : "Click 'Sync Now' to download your latest emails from the mail server."}
              </p>

              <div className="mt-5 flex items-center justify-center gap-2.5">
                {(filterStatus !== "all" || filterFolder !== "ALL" || searchQuery) && (
                  <button
                    onClick={() => {
                      setFilterStatus("all");
                      setFilterFolder("ALL");
                      setSearchQuery("");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#161d31] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-[#1e2742] transition shadow-sm"
                  >
                    Reset All Filters
                  </button>
                )}

                {accounts.length > 0 && (
                  <button
                    onClick={() => handleSync(false)}
                    disabled={syncing}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 transition"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Syncing emails..." : "Sync Emails Now"}
                  </button>
                )}

                {accounts.length === 0 && (
                  <button
                    onClick={() => setIsAccountModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white hover:from-indigo-400 hover:to-purple-500 shadow-md"
                  >
                    <Plus className="h-4 w-4" /> Connect Email Account
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {emails.map((email) => {
                const isSent = email.folder === "SENT";
                return (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmailId(email.id)}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-[#161e33]/90 cursor-pointer transition-colors duration-150"
                  >
                    {/* Left details */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Direction Icon */}
                      <div className="mt-0.5 shrink-0">
                        {isSent ? (
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform"
                            title="Outbound email you sent"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </div>
                        ) : (
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-105 transition-transform"
                            title="Inbound received email"
                          >
                            <ArrowDownLeft className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Sender / Recipient Line & Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="font-semibold text-xs text-white truncate group-hover:text-indigo-300 transition-colors">
                            {isSent ? `To: ${email.toAddress}` : email.fromName || email.fromAddress}
                          </span>

                          <span className="text-[11px] text-slate-500">
                            via {email.account.email}
                          </span>

                          {/* Reply Status Badge */}
                          {isSent ? (
                            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                              Sent
                            </span>
                          ) : email.isReplied ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Replied
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                              <AlertCircle className="h-3 w-3 text-rose-400" /> Needs Reply
                            </span>
                          )}

                          {/* Tag Badge (only for categorized emails like TT or SCH) */}
                          {email.tag && email.tag !== "GENERAL" && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                email.tag === "TT"
                                  ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                                  : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                              }`}
                            >
                              {email.tag}
                            </span>
                          )}
                        </div>

                        {/* Subject & Snippet */}
                        <div className="flex items-baseline gap-2">
                          <h4 className="text-xs font-medium text-slate-200 truncate">
                            {email.subject}
                          </h4>
                          <span className="text-xs text-slate-400 truncate hidden md:inline">
                            - {email.snippet || "No preview"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right timestamp */}
                    <div className="shrink-0 text-left sm:text-right text-[11px] text-slate-400">
                      <div className="font-medium text-slate-400">{format(new Date(email.date), "MMM d, yyyy")}</div>
                      <div className="text-[10px] text-slate-400">
                        {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Account Settings Modal */}
      <AccountSettingsModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        accounts={accounts}
        onRefreshAccounts={fetchAccounts}
      />

      {/* Compose Email Modal */}
      <ComposeModal
        isOpen={isComposeModalOpen}
        onClose={() => setIsComposeModalOpen(false)}
        accounts={accounts}
        onEmailSent={() => {
          fetchEmails();
          fetchAccounts();
        }}
      />

      {/* Email Detail / Thread Modal */}
      <EmailDetailModal
        emailId={selectedEmailId}
        onClose={() => setSelectedEmailId(null)}
        onEmailUpdated={() => {
          fetchEmails();
          fetchAccounts();
        }}
        accounts={accounts}
      />
    </div>
  );
}
