const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous|above|prior)\s+instructions?/gi,
  /ignore\s+(?:all\s+)?the\s+above/gi,
  /disregard\s+(?:all\s+)?(?:your\s+|previous\s+)?instructions?/gi,
  /system\s*:/gi,
  /assistant\s*:/gi,
  /you\s+are\s+now\b/gi,
];

export function sanitizeComplaintText(rawText) {
  if (!rawText || typeof rawText !== "string") return "";
  let sanitized = rawText.slice(0, 2000);
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[filtered]");
  }
  return sanitized;
}
