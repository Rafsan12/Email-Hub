import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "../prisma";
import { classifyEmail } from "./classifier";

export interface SyncResult {
  accountId: string;
  accountEmail: string;
  inboxCount: number;
  sentCount: number;
  repliesDetected: number;
  error?: string;
}

// Find standard Sent folder across different servers (Gmail, cPanel, Dovecot, etc.)
async function findSentMailbox(client: ImapFlow): Promise<string | null> {
  try {
    const mailboxes = await client.list();
    for (const box of mailboxes) {
      if (box.specialUse === "\\Sent") {
        return box.path;
      }
    }

    const candidates = [
      "[Gmail]/Sent Mail",
      "Sent",
      "Sent Messages",
      "INBOX.Sent",
      "Sent Items",
    ];

    for (const candidate of candidates) {
      const found = mailboxes.find(
        (m) => m.path.toLowerCase() === candidate.toLowerCase()
      );
      if (found) return found.path;
    }
  } catch {
    // ignore
  }

  return null;
}

export async function syncAccount(accountId: string): Promise<SyncResult> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapSecure,
    auth: {
      user: account.imapUser,
      pass: account.imapPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    logger: false,
    emitLogs: false,
  });

  // CRITICAL: Handle socket-level errors so they don't become uncaughtException: ECONNRESET
  client.on("error", (err: any) => {
    console.warn(`[IMAP] Network warning for ${account.email}: ${err.message || err.code}`);
  });

  const result: SyncResult = {
    accountId: account.id,
    accountEmail: account.email,
    inboxCount: 0,
    sentCount: 0,
    repliesDetected: 0,
  };

  try {
    await client.connect();

    // 1. SYNC INBOX
    try {
      const inboxLock = await client.getMailboxLock("INBOX");
      try {
        const mailbox = client.mailbox;
        const totalMessages = mailbox ? mailbox.exists : 0;
        // Fetch latest 40 messages to prevent cPanel/Dovecot socket overload
        const startSeq = Math.max(1, totalMessages - 39);

        if (totalMessages > 0) {
          const messages = client.fetch(`${startSeq}:*`, {
            uid: true,
            flags: true,
            envelope: true,
            source: { maxLength: 65536 }, // 64KB is plenty for text/headers and prevents rate-limit drops
          });

          for await (const msg of messages) {
            result.inboxCount++;
            const uid = msg.uid;
            const flags = msg.flags ? Array.from(msg.flags) : [];
            const isAnsweredFlag = flags.includes("\\Answered");
            const isSeenFlag = flags.includes("\\Seen");

            let parsed: any = null;
            if (msg.source) {
              try {
                parsed = await simpleParser(msg.source);
              } catch {
                // fallback to envelope
              }
            }

            const messageId = parsed?.messageId || msg.envelope?.messageId || null;
            const inReplyTo = parsed?.inReplyTo || msg.envelope?.inReplyTo || null;
            const references = Array.isArray(parsed?.references)
              ? parsed.references.join(" ")
              : parsed?.references || null;

            const fromAddress =
              parsed?.from?.value?.[0]?.address ||
              msg.envelope?.from?.[0]?.address ||
              "unknown";
            const fromName =
              parsed?.from?.value?.[0]?.name || msg.envelope?.from?.[0]?.name || "";
            const toAddress =
              parsed?.to?.value?.[0]?.address ||
              msg.envelope?.to?.[0]?.address ||
              account.email;
            const toName =
              parsed?.to?.value?.[0]?.name || msg.envelope?.to?.[0]?.name || "";

            const subject = parsed?.subject || msg.envelope?.subject || "(No Subject)";
            const bodyText = parsed?.text || "";
            const bodyHtml = parsed?.html ? String(parsed.html) : undefined;
            const date = parsed?.date || msg.envelope?.date || new Date();
            const snippet = bodyText.slice(0, 150).replace(/\s+/g, " ").trim();

            const tag = classifyEmail(
              subject,
              bodyText,
              fromAddress,
              account.name,
              account.email
            );

            const threadId =
              inReplyTo || messageId || subject.replace(/^(re|fwd):\s*/i, "").trim();

            const existing = await prisma.email.findFirst({
              where: {
                accountId: account.id,
                OR: [
                  ...(messageId ? [{ messageId }] : []),
                  { uid, folder: "INBOX" },
                ],
              },
            });

            if (!existing) {
              await prisma.email.create({
                data: {
                  accountId: account.id,
                  uid,
                  messageId,
                  inReplyTo,
                  references,
                  threadId,
                  fromAddress,
                  fromName,
                  toAddress,
                  toName,
                  subject,
                  snippet,
                  bodyText,
                  bodyHtml,
                  date: new Date(date),
                  folder: "INBOX",
                  isRead: isSeenFlag,
                  isReplied: isAnsweredFlag,
                  tag,
                },
              });
            } else {
              await prisma.email.update({
                where: { id: existing.id },
                data: {
                  isRead: isSeenFlag || existing.isRead,
                  isReplied: isAnsweredFlag || existing.isReplied,
                  tag,
                },
              });
            }
          }
        }
      } finally {
        inboxLock.release();
      }
    } catch (inboxErr: any) {
      console.warn(`Inbox sync partial warning for ${account.email}:`, inboxErr.message);
    }

    // 2. SYNC SENT FOLDER
    if (client.usable) {
      const sentBoxPath = await findSentMailbox(client);
      if (sentBoxPath) {
        try {
          const sentLock = await client.getMailboxLock(sentBoxPath);
          try {
            const mailbox = client.mailbox;
            const totalMessages = mailbox ? mailbox.exists : 0;
            const startSeq = Math.max(1, totalMessages - 39);

            if (totalMessages > 0) {
              const sentMessages = client.fetch(`${startSeq}:*`, {
                uid: true,
                envelope: true,
                source: { maxLength: 65536 },
              });

              for await (const msg of sentMessages) {
                result.sentCount++;
                let parsed: any = null;
                if (msg.source) {
                  try {
                    parsed = await simpleParser(msg.source);
                  } catch {
                    // fallback to envelope
                  }
                }

                const messageId = parsed?.messageId || msg.envelope?.messageId || null;
                const inReplyTo = parsed?.inReplyTo || msg.envelope?.inReplyTo || null;
                const references = Array.isArray(parsed?.references)
                  ? parsed.references.join(" ")
                  : parsed?.references || null;

                const fromAddress =
                  parsed?.from?.value?.[0]?.address ||
                  msg.envelope?.from?.[0]?.address ||
                  account.email;
                const fromName =
                  parsed?.from?.value?.[0]?.name || msg.envelope?.from?.[0]?.name || "";
                const toAddress =
                  parsed?.to?.value?.[0]?.address ||
                  msg.envelope?.to?.[0]?.address ||
                  "unknown";
                const toName =
                  parsed?.to?.value?.[0]?.name || msg.envelope?.to?.[0]?.name || "";

                const subject = parsed?.subject || msg.envelope?.subject || "(No Subject)";
                const bodyText = parsed?.text || "";
                const bodyHtml = parsed?.html ? String(parsed.html) : undefined;
                const date = parsed?.date || msg.envelope?.date || new Date();
                const snippet = bodyText.slice(0, 150).replace(/\s+/g, " ").trim();
                const tag = classifyEmail(
                  subject,
                  bodyText,
                  fromAddress,
                  account.name,
                  account.email
                );

                const existingSent = await prisma.email.findFirst({
                  where: {
                    accountId: account.id,
                    OR: [
                      ...(messageId ? [{ messageId }] : []),
                      { uid: msg.uid, folder: "SENT" },
                    ],
                  },
                });

                if (!existingSent) {
                  await prisma.email.create({
                    data: {
                      accountId: account.id,
                      uid: msg.uid,
                      messageId,
                      inReplyTo,
                      references,
                      threadId:
                        inReplyTo || messageId || subject.replace(/^(re|fwd):\s*/i, "").trim(),
                      fromAddress,
                      fromName,
                      toAddress,
                      toName,
                      subject,
                      snippet,
                      bodyText,
                      bodyHtml,
                      date: new Date(date),
                      folder: "SENT",
                      isRead: true,
                      isReplied: true,
                      tag,
                    },
                  });
                } else {
                  await prisma.email.update({
                    where: { id: existingSent.id },
                    data: { tag },
                  });
                }

                if (inReplyTo) {
                  const matchedInbound = await prisma.email.findFirst({
                    where: {
                      accountId: account.id,
                      messageId: inReplyTo,
                    },
                  });

                  if (matchedInbound && !matchedInbound.isReplied) {
                    await prisma.email.update({
                      where: { id: matchedInbound.id },
                      data: {
                        isReplied: true,
                        repliedAt: new Date(date),
                      },
                    });
                    result.repliesDetected++;
                  }
                }
              }
            }
          } finally {
            sentLock.release();
          }
        } catch (sentErr: any) {
          console.warn(`Sent folder sync warning for ${account.email}:`, sentErr.message);
        }
      }
    }

    // Update account lastSyncedAt
    await prisma.account.update({
      where: { id: account.id },
      data: { lastSyncedAt: new Date() },
    });
  } catch (err: any) {
    console.error(`Sync error for account ${account.email}:`, err);
    result.error = err.message || "Connection interrupted";
  } finally {
    try {
      if (client.usable) {
        await client.logout();
      } else {
        client.close();
      }
    } catch {
      // ignore
    }
  }

  return result;
}

export async function syncAllAccounts(): Promise<SyncResult[]> {
  const accounts = await prisma.account.findMany();
  const results: SyncResult[] = [];

  for (const account of accounts) {
    const res = await syncAccount(account.id);
    results.push(res);
  }

  return results;
}
