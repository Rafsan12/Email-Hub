"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Send,
  Reply,
  CheckCircle2,
  AlertCircle,
  Tag,
  Clock,
  User,
  RefreshCw,
  Mail,
  ChevronDown,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

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

interface EmailDetailModalProps {
  emailId: string | null;
  onClose: () => void;
  onEmailUpdated: () => void;
  accounts: Array<{ id: string; name: string; email: string }>;
}

export default function EmailDetailModal({
  emailId,
  onClose,
  onEmailUpdated,
  accounts,
}: EmailDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<EmailItem | null>(null);
  const [thread, setThread] = useState<EmailItem[]>([]);
  const [showReplyBox, setShowReplyBox] = useState(false);

  // Reply form state
  const [replyAccountId, setReplyAccountId] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [tagUpdating, setTagUpdating] = useState(false);

  useEffect(() => {
    if (!emailId) {
      setEmail(null);
      setThread([]);
      setShowReplyBox(false);
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/emails/${emailId}`);
        const data = await res.json();
        if (res.ok) {
          setEmail(data.email);
          setThread(data.thread || [data.email]);
          setReplyAccountId(data.email.accountId);
        }
      } catch (err) {
        console.error("Failed to fetch email detail:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [emailId]);

  if (!emailId) return null;

  const handleUpdateTag = async (newTag: string) => {
    if (!email) return;
    setTagUpdating(true);
    try {
      const res = await fetch("/api/emails", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: email.id, tag: newTag }),
      });
      if (res.ok) {
        setEmail({ ...email, tag: newTag });
        onEmailUpdated();
      }
    } finally {
      setTagUpdating(false);
    }
  };

  const handleToggleReplied = async () => {
    if (!email) return;
    try {
      const nextReplied = !email.isReplied;
      const res = await fetch("/api/emails", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: email.id, isReplied: nextReplied }),
      });
      if (res.ok) {
        setEmail({
          ...email,
          isReplied: nextReplied,
          repliedAt: nextReplied ? new Date().toISOString() : null,
        });
        onEmailUpdated();
      }
    } catch (err) {
      console.error("Failed to toggle replied status:", err);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !replyBody.trim()) return;

    setSendingReply(true);
    try {
      const targetAccount = accounts.find((a) => a.id === replyAccountId) || email.account;
      const cleanSubject = email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`;

      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: targetAccount.id,
          to: email.folder === "SENT" ? email.toAddress : email.fromAddress,
          subject: cleanSubject,
          bodyText: replyBody,
          inReplyToMessageId: email.messageId,
          originalEmailId: email.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to send reply");
      } else {
        setReplyBody("");
        setShowReplyBox(false);
        setEmail({ ...email, isReplied: true, repliedAt: new Date().toISOString() });
        const refreshRes = await fetch(`/api/emails/${email.id}`);
        const refreshData = await refreshRes.json();
        if (refreshRes.ok) {
          setThread(refreshData.thread);
        }
        onEmailUpdated();
      }
    } catch (err: any) {
      alert("Error sending reply: " + err.message);
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-[#0f1422] border border-white/10 shadow-2xl shadow-black/90 overflow-hidden text-slate-100">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#121727]/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                email?.isReplied
                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                  : email?.folder === "SENT"
                  ? "bg-amber-500/15 border border-amber-500/30 text-amber-300"
                  : "bg-rose-500/15 border border-rose-500/30 text-rose-300"
              }`}
            >
              {email?.isReplied ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Replied
                </>
              ) : email?.folder === "SENT" ? (
                <>
                  <Send className="h-3.5 w-3.5 text-amber-400" /> Outbound Sent
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-rose-400" /> Needs Reply
                </>
              )}
            </span>

            {/* Tag Badges */}
            <div className="flex items-center gap-1.5">
              {(["TT", "SCH", "GENERAL"] as const).map((t) => (
                <button
                  key={t}
                  disabled={tagUpdating}
                  onClick={() => handleUpdateTag(t)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition ${
                    email?.tag === t
                      ? t === "TT"
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm"
                        : t === "SCH"
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm"
                        : "bg-white/10 text-white border-white/20"
                      : "bg-[#161d31] text-slate-400 border-white/5 hover:text-white hover:bg-[#1c253e]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {email && email.folder === "INBOX" && (
              <button
                onClick={handleToggleReplied}
                className="rounded-xl border border-white/10 bg-[#161d31] px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-[#202946] hover:text-white transition shadow-sm"
              >
                {email.isReplied ? "Mark as Needs Reply" : "Mark as Replied"}
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-5">
          {loading || !email ? (
            <div className="flex h-64 items-center justify-center">
              <RefreshCw className="h-7 w-7 animate-spin text-indigo-400" />
            </div>
          ) : (
            <>
              {/* Subject & Meta Information */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#121727]/80 p-5 shadow-md space-y-3">
                <h1 className="text-xl font-bold text-white leading-snug">{email.subject}</h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-white/[0.06] text-xs">
                  <div>
                    <span className="font-semibold text-slate-400">From: </span>
                    <span className="font-medium text-slate-200">
                      {email.fromName ? `${email.fromName} <${email.fromAddress}>` : email.fromAddress}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">To: </span>
                    <span className="font-medium text-slate-200">
                      {email.toName ? `${email.toName} <${email.toAddress}>` : email.toAddress}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">Account: </span>
                    <span className="font-medium text-indigo-300">{email.account.email}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">Date: </span>
                    <span className="text-slate-300">
                      {format(new Date(email.date), "PPP p")} (
                      {formatDistanceToNow(new Date(email.date), { addSuffix: true })})
                    </span>
                  </div>
                </div>
              </div>

              {/* Email Content Box */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#121727]/80 p-6 shadow-md">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center justify-between">
                  <span>Message Body</span>
                  <button
                    onClick={() => setShowReplyBox(!showReplyBox)}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:from-indigo-400 hover:to-purple-500 transition shadow-md shadow-indigo-500/20"
                  >
                    <Reply className="h-3.5 w-3.5" /> Reply
                  </button>
                </div>

                {email.bodyHtml ? (
                  <div
                    className="prose prose-invert prose-sm max-w-none text-slate-200 overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap font-sans text-sm text-slate-200 leading-relaxed">
                    {email.bodyText || "(No content)"}
                  </div>
                )}
              </div>

              {/* Quick Reply Form */}
              {showReplyBox && (
                <form
                  onSubmit={handleSendReply}
                  className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-5 shadow-lg space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                      <Reply className="h-4 w-4 text-indigo-400" /> Compose Reply
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowReplyBox(false)}
                      className="text-xs text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-medium text-slate-300 mb-1">Send From Account:</label>
                      <select
                        value={replyAccountId}
                        onChange={(e) => setReplyAccountId(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#0d121f] px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-slate-300 mb-1">To Recipient:</label>
                      <input
                        type="text"
                        disabled
                        value={email.folder === "SENT" ? email.toAddress : email.fromAddress}
                        className="w-full rounded-xl border border-white/5 bg-[#090d16] px-3 py-2 text-xs text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Your Reply Message:</label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Type your reply here..."
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#0d121f] p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={sendingReply || !replyBody.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 transition"
                    >
                      {sendingReply ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Send Reply Now
                    </button>
                  </div>
                </form>
              )}

              {/* Thread History & Activity Timeline */}
              {thread.length > 1 && (
                <div className="rounded-2xl border border-white/[0.08] bg-[#121727]/80 p-5 shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" /> Conversation Timeline ({thread.length} messages)
                    </h3>
                  </div>

                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                    {thread.map((tMsg) => {
                      const isSent = tMsg.folder === "SENT";
                      return (
                        <div key={tMsg.id} className="relative">
                          <span
                            className={`absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                              isSent ? "bg-amber-500 text-slate-950 font-bold" : "bg-cyan-500 text-slate-950 font-bold"
                            }`}
                          >
                            {isSent ? "↑" : "↓"}
                          </span>
                          <div className="rounded-xl border border-white/5 bg-[#161d31] p-3.5 text-xs">
                            <div className="flex items-center justify-between font-semibold text-slate-200">
                              <span>
                                {isSent ? `You sent an email to ${tMsg.toAddress}` : `Received from ${tMsg.fromAddress}`}
                              </span>
                              <span className="text-[11px] text-slate-500 font-normal">
                                {format(new Date(tMsg.date), "MMM d, h:mm a")}
                              </span>
                            </div>
                            <p className="mt-1 text-slate-400 line-clamp-2">{tMsg.snippet || tMsg.bodyText?.slice(0, 120)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
