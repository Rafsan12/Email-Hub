import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { prisma } from "../prisma";
import { classifyEmail } from "./classifier";

export interface SendEmailParams {
  accountId: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  inReplyToMessageId?: string;
  originalEmailId?: string;
}

export async function sendEmail(params: SendEmailParams) {
  const account = await prisma.account.findUnique({
    where: { id: params.accountId },
  });

  if (!account) {
    throw new Error(`Account not found: ${params.accountId}`);
  }

  // 1. Setup Nodemailer Transporter
  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpSecure, // true for 465, false for other ports (587, etc.)
    auth: {
      user: account.smtpUser,
      pass: account.smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // 2. Prepare headers if replying
  let references: string | undefined;
  if (params.inReplyToMessageId) {
    references = params.inReplyToMessageId;
  }

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"${account.name}" <${account.email}>`,
    to: params.to,
    subject: params.subject,
    text: params.bodyText,
    html: params.bodyHtml || params.bodyText.replace(/\n/g, "<br>"),
    inReplyTo: params.inReplyToMessageId,
    references: references,
  };

  // 3. Send email via SMTP
  const sendInfo = await transporter.sendMail(mailOptions);
  const messageId = sendInfo.messageId || `<${Date.now()}@${account.email.split("@")[1]}>`;

  // 4. Record the sent email in the SQLite database
  const tag = classifyEmail(params.subject, params.bodyText, account.email);
  const sentDate = new Date();

  const sentEmail = await prisma.email.create({
    data: {
      accountId: account.id,
      messageId: messageId,
      inReplyTo: params.inReplyToMessageId,
      references: references,
      threadId:
        params.inReplyToMessageId ||
        messageId ||
        params.subject.replace(/^(re|fwd):\s*/i, "").trim(),
      fromAddress: account.email,
      fromName: account.name,
      toAddress: params.to,
      subject: params.subject,
      snippet: params.bodyText.slice(0, 150).replace(/\s+/g, " ").trim(),
      bodyText: params.bodyText,
      bodyHtml: params.bodyHtml,
      date: sentDate,
      folder: "SENT",
      isRead: true,
      isReplied: true,
      tag: tag,
    },
  });

  // 5. If replying to an existing inbound email in DB, mark it as replied
  if (params.originalEmailId) {
    await prisma.email.update({
      where: { id: params.originalEmailId },
      data: {
        isReplied: true,
        repliedAt: sentDate,
      },
    });
  } else if (params.inReplyToMessageId) {
    await prisma.email.updateMany({
      where: {
        accountId: account.id,
        messageId: params.inReplyToMessageId,
      },
      data: {
        isReplied: true,
        repliedAt: sentDate,
      },
    });
  }

  // 6. Optional best effort: append message to IMAP Sent mailbox
  try {
    const imapClient = new ImapFlow({
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
    });

    await imapClient.connect();
    // find Sent mailbox
    const mailboxes = await imapClient.list();
    let sentPath = "[Gmail]/Sent Mail";
    const foundBox = mailboxes.find(
      (m) =>
        m.specialUse === "\\Sent" ||
        ["sent", "[gmail]/sent mail", "sent messages", "inbox.sent"].includes(
          m.path.toLowerCase()
        )
    );
    if (foundBox) {
      sentPath = foundBox.path;
    }

    // Compose raw message for append
    const rawHeaders = [
      `From: "${account.name}" <${account.email}>`,
      `To: ${params.to}`,
      `Subject: ${params.subject}`,
      `Date: ${sentDate.toUTCString()}`,
      `Message-ID: ${messageId}`,
      params.inReplyToMessageId ? `In-Reply-To: ${params.inReplyToMessageId}` : "",
      references ? `References: ${references}` : "",
      `Content-Type: text/plain; charset=utf-8`,
      "",
      params.bodyText,
    ]
      .filter((line) => line !== "")
      .join("\r\n");

    await imapClient.append(sentPath, Buffer.from(rawHeaders), ["\\Seen"]);
    await imapClient.logout();
  } catch (appendErr) {
    // Non-fatal if append fails (some SMTP servers auto-append, e.g. Gmail)
    console.warn("Could not append sent message to IMAP Sent folder:", appendErr);
  }

  return sentEmail;
}
