import { NextResponse } from "next/server";
import { syncAccount, syncAllAccounts } from "@/lib/email/sync";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { accountId } = body;

    if (accountId) {
      const result = await syncAccount(accountId);
      return NextResponse.json({ results: [result] });
    } else {
      const results = await syncAllAccounts();
      return NextResponse.json({ results });
    }
  } catch (error: any) {
    console.error("Sync API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync emails" },
      { status: 500 }
    );
  }
}
