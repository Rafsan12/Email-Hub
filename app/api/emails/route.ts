import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const status = searchParams.get("status"); // "needs_reply" | "replied" | "all"
    const tag = searchParams.get("tag"); // "TT" | "SCH" | "GENERAL" | "all"
    const folder = searchParams.get("folder") || "ALL"; // "INBOX" | "SENT" | "ALL"
    const search = searchParams.get("search");

    const where: any = {};

    if (accountId && accountId !== "all") {
      where.accountId = accountId;
    }

    if (folder !== "ALL") {
      where.folder = folder;
    }

    if (status === "needs_reply") {
      where.isReplied = false;
      where.folder = "INBOX";
    } else if (status === "replied") {
      where.isReplied = true;
    }

    if (tag && tag !== "all") {
      where.tag = tag;
    }

    if (search && search.trim() !== "") {
      const q = search.trim();
      where.OR = [
        { subject: { contains: q } },
        { snippet: { contains: q } },
        { fromAddress: { contains: q } },
        { fromName: { contains: q } },
        { toAddress: { contains: q } },
        { toName: { contains: q } },
      ];
    }

    // Query emails
    const emails = await prisma.email.findMany({
      where,
      include: {
        account: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { date: "desc" },
      take: 100,
    });

    // Calculate overall stats for quick badge metrics
    const statsWhere: any = {};
    if (accountId && accountId !== "all") {
      statsWhere.accountId = accountId;
    }

    const [totalInbox, needsReplyCount, repliedCount, ttCount, schCount, sentCount] =
      await Promise.all([
        prisma.email.count({ where: { ...statsWhere, folder: "INBOX" } }),
        prisma.email.count({
          where: { ...statsWhere, folder: "INBOX", isReplied: false },
        }),
        prisma.email.count({
          where: { ...statsWhere, folder: "INBOX", isReplied: true },
        }),
        prisma.email.count({ where: { ...statsWhere, tag: "TT" } }),
        prisma.email.count({ where: { ...statsWhere, tag: "SCH" } }),
        prisma.email.count({ where: { ...statsWhere, folder: "SENT" } }),
      ]);

    return NextResponse.json({
      emails,
      stats: {
        totalInbox,
        needsReplyCount,
        repliedCount,
        ttCount,
        schCount,
        sentCount,
      },
    });
  } catch (error: any) {
    console.error("Emails query error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch emails" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, tag, isReplied } = body;

    if (!id) {
      return NextResponse.json({ error: "Email ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (tag !== undefined) updateData.tag = tag;
    if (isReplied !== undefined) {
      updateData.isReplied = Boolean(isReplied);
      if (isReplied) {
        updateData.repliedAt = new Date();
      } else {
        updateData.repliedAt = null;
      }
    }

    const updated = await prisma.email.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ email: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update email" },
      { status: 500 }
    );
  }
}
