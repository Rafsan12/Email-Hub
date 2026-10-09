export type EmailTag = "TT" | "SCH" | "GENERAL";

/**
 * Classifies an email strictly based on domain and subject tags.
 * Only tags as TT if from/to trainingtale.org or subject has specific TT ticket codes.
 * Regular personal/AWS/Gmail accounts are NOT tagged as TT.
 */
export function classifyEmail(
  subject: string = "",
  bodyText: string = "",
  fromAddress: string = "",
  accountName: string = "",
  accountEmail: string = ""
): EmailTag {
  const normEmail = (accountEmail || "").toUpperCase().trim();
  const normFrom = (fromAddress || "").toUpperCase().trim();
  const normSubject = (subject || "").toUpperCase();

  // 1. Only trainingtale domain accounts are TT
  if (normEmail.includes("TRAININGTALE") || normFrom.includes("TRAININGTALE")) {
    return "TT";
  }

  // 2. Strict Subject-only check for ticket codes (e.g. TT-1024, [TT])
  if (/\b(TT[-_#:]\d+|\[TT\]|#TT)/i.test(normSubject)) {
    return "TT";
  }

  // 3. Strict Subject-only check for schedule codes (e.g. SCH-1024, [SCH])
  if (/\b(SCH[-_#:]\d+|\[SCH\]|#SCH)\b/i.test(normSubject)) {
    return "SCH";
  }

  return "GENERAL";
}
