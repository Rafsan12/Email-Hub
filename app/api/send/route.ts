import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/sender";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      accountId,
      to,
      subject,
      bodyText,
      bodyHtml,
      inReplyToMessageId,
      originalEmailId,
    } = body;

    if (!accountId || !to || !subject || !bodyText) {
      return NextResponse.json(
        { error: "Account, recipient (to), subject, and body are required." },
        { status: 400 }
      );
    }

    const sentEmail = await sendEmail({
      accountId,
      to: to.trim(),
      subject: subject.trim(),
      bodyText,
      bodyHtml,
      inReplyToMessageId,
      originalEmailId,
    });

    return NextResponse.json({ success: true, email: sentEmail });
  } catch (error: any) {
    console.error("Send email error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
