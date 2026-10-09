import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Clean any legacy [TT] or [SCH] appended to account names
    const rawAccounts = await prisma.account.findMany();
    for (const acc of rawAccounts) {
      if (acc.name.endsWith(" [TT]") || acc.name.endsWith(" [SCH]")) {
        const cleanName = acc.name.replace(/\s*\[(TT|SCH)\]$/, "");
        await prisma.account.update({
          where: { id: acc.id },
          data: { name: cleanName },
        });
      }
    }

    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
        imapHost: true,
        imapPort: true,
        imapUser: true,
        imapSecure: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpSecure: true,
        lastSyncedAt: true,
        createdAt: true,
        _count: {
          select: { emails: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ accounts });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load accounts" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      type = "WEBMAIL",
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

    if (!name || !email || !imapHost || !imapUser || !imapPass || !smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json(
        { error: "Missing required account fields." },
        { status: 400 }
      );
    }

    const account = await prisma.account.create({
      data: {
        name,
        email: email.trim().toLowerCase(),
        type,
        imapHost,
        imapPort: Number(imapPort),
        imapUser,
        imapPass,
        imapSecure: Boolean(imapSecure),
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpUser,
        smtpPass,
        smtpSecure: Boolean(smtpSecure),
      },
    });

    return NextResponse.json({
      account: {
        id: account.id,
        name: account.name,
        email: account.email,
        type: account.type,
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to create account" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    await prisma.account.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete account" },
      { status: 500 }
    );
  }
}
