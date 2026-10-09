import React from "react";
import { AlertCircle, CheckCircle2, Inbox, Send, ArrowUpRight } from "lucide-react";

interface StatsProps {
  stats: {
    totalInbox: number;
    needsReplyCount: number;
    repliedCount: number;
    sentCount: number;
  };
  activeFilter: {
    status: string;
    folder: string;
  };
  onFilterChange: (type: "status" | "folder", value: string) => void;
}

export default function StatsCards({ stats, activeFilter, onFilterChange }: StatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {/* Needs Reply */}
      <button
        onClick={() => onFilterChange("status", activeFilter.status === "needs_reply" ? "all" : "needs_reply")}
        className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 ${
          activeFilter.status === "needs_reply"
            ? "border border-rose-500/50 bg-gradient-to-b from-rose-950/30 to-[#121727] shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/50"
            : "border border-white/[0.07] bg-[#111726]/80 hover:border-rose-500/30 hover:bg-[#141b2d] shadow-sm hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-rose-500 ring-4 ring-rose-500/20 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400/90">Needs Reply</span>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
            <AlertCircle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">{stats.needsReplyCount}</span>
          <span className="text-xs font-medium text-rose-400/70">pending</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Emails waiting for your response</p>
      </button>

      {/* Replied */}
      <button
        onClick={() => onFilterChange("status", activeFilter.status === "replied" ? "all" : "replied")}
        className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 ${
          activeFilter.status === "replied"
            ? "border border-emerald-500/50 bg-gradient-to-b from-emerald-950/30 to-[#121727] shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50"
            : "border border-white/[0.07] bg-[#111726]/80 hover:border-emerald-500/30 hover:bg-[#141b2d] shadow-sm hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">Replied</span>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">{stats.repliedCount}</span>
          <span className="text-xs font-medium text-emerald-400/70">answered</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Successfully handled conversations</p>
      </button>

      {/* Inbox Total */}
      <button
        onClick={() => onFilterChange("folder", activeFilter.folder === "INBOX" ? "ALL" : "INBOX")}
        className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 ${
          activeFilter.folder === "INBOX"
            ? "border border-cyan-500/50 bg-gradient-to-b from-cyan-950/30 to-[#121727] shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/50"
            : "border border-white/[0.07] bg-[#111726]/80 hover:border-cyan-500/30 hover:bg-[#141b2d] shadow-sm hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-500 ring-4 ring-cyan-500/20" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400/90">Inbox</span>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
            <Inbox className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">{stats.totalInbox}</span>
          <span className="text-xs font-medium text-cyan-400/70">received</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Total inbound messages stored</p>
      </button>

      {/* Sent Mail */}
      <button
        onClick={() => onFilterChange("folder", activeFilter.folder === "SENT" ? "ALL" : "SENT")}
        className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 ${
          activeFilter.folder === "SENT"
            ? "border border-amber-500/50 bg-gradient-to-b from-amber-950/30 to-[#121727] shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/50"
            : "border border-white/[0.07] bg-[#111726]/80 hover:border-amber-500/30 hover:bg-[#141b2d] shadow-sm hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">Sent Mail</span>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
            <Send className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">{stats.sentCount}</span>
          <span className="text-xs font-medium text-amber-400/70">outbound</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Sent messages & replies</p>
      </button>
    </div>
  );
}
