import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const email = await prisma.email.findUnique({
      where: { id: params.id },
      include: {
        account: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // Mark as read if not already
    if (!email.isRead) {
      await prisma.email.update({
        where: { id: email.id },
        data: { isRead: true },
      });
    }

    // Find thread messages (either by threadId or clean subject match)
    const normalizedSubject = email.subject.replace(/^(re|fwd):\s*/i, "").trim();

    const threadEmails = await prisma.email.findMany({
      where: {
        accountId: email.accountId,
        OR: [
          ...(email.threadId ? [{ threadId: email.threadId }] : []),
          ...(email.messageId ? [{ inReplyTo: email.messageId }] : []),
          ...(email.inReplyTo ? [{ messageId: email.inReplyTo }] : []),
          { subject: { contains: normalizedSubject } },
        ],
      },
      orderBy: { date: "asc" },
      include: {
        account: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      email,
      thread: threadEmails,
    });
  } catch (error: any) {
    console.error("Email detail error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch email details" },
      { status: 500 }
    );
  }
}
