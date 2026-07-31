import "server-only";

export interface LogContext {
  catalogId?: string;
  syncId?: string;
  cursor?: number;
  expectedCount?: number;
  importedCount?: number;
  warningCount?: number;
  environment?: string;
  [key: string]: unknown;
}

const SENSITIVE_PATTERNS = [
  /postgres:\/\/[^@]+@/gi,
  /bearer\s+[a-z0-9_\-\.]+/gi,
  /secret/gi,
  /password/gi,
  /authorization/gi,
];

export function sanitizeLogValue(val: unknown): unknown {
  if (typeof val === "string") {
    let sanitized = val;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, "[REDACTED]");
    }
    return sanitized;
  }

  if (typeof val === "object" && val !== null) {
    if (Array.isArray(val)) {
      return val.map(sanitizeLogValue);
    }

    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(val)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("secret") ||
        lowerKey.includes("key") ||
        lowerKey.includes("password") ||
        lowerKey.includes("token") ||
        lowerKey.includes("auth") ||
        lowerKey.includes("postgres")
      ) {
        sanitizedObj[key] = "[REDACTED]";
      } else {
        sanitizedObj[key] = sanitizeLogValue(value);
      }
    }
    return sanitizedObj;
  }

  return val;
}

export function logInfo(message: string, context?: LogContext): void {
  const safeCtx = sanitizeLogValue(context);
  console.log(`[INFO] ${message}`, safeCtx || "");
}

export function logWarning(message: string, context?: LogContext): void {
  const safeCtx = sanitizeLogValue(context);
  console.warn(`[WARN] ${message}`, safeCtx || "");
}

export function logError(error: Error | string, context?: LogContext): void {
  const msg = typeof error === "string" ? error : error.message;
  const safeCtx = sanitizeLogValue(context);
  console.error(`[ERROR] ${msg}`, safeCtx || "");
}
