import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      imapHost,
      imapPort = 993,
      imapUser,
      imapPass,
      imapSecure = true,
      smtpHost,
      smtpPort = 465,
      smtpUser,
      smtpPass,
      smtpSecure = true,
    } = body;

    // 1. Test IMAP
    const imapClient = new ImapFlow({
      host: imapHost,
      port: Number(imapPort),
      secure: Boolean(imapSecure),
      auth: {
        user: imapUser,
        pass: imapPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      logger: false,
    });

    try {
      await imapClient.connect();
      await imapClient.logout();
    } catch (imapErr: any) {
      return NextResponse.json(
        { error: `IMAP connection failed: ${imapErr.message}` },
        { status: 400 }
      );
    }

    // 2. Test SMTP
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Boolean(smtpSecure),
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    try {
      await transporter.verify();
    } catch (smtpErr: any) {
      return NextResponse.json(
        { error: `SMTP connection failed: ${smtpErr.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "IMAP & SMTP connection successful!" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Connection test failed" },
      { status: 500 }
    );
  }
}
