import { isRedirectError } from "next/dist/client/components/redirect-error";

/** Rethrow Next.js control-flow errors so catch blocks never surface NEXT_REDIRECT. */
export function rethrowNextControlFlow(error: unknown): void {
  if (isRedirectError(error)) throw error;
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: string }).digest ?? "").startsWith(
      "NEXT_NOT_FOUND",
    )
  ) {
    throw error;
  }
}

export function actionErrorMessage(error: unknown, fallback: string): string {
  rethrowNextControlFlow(error);
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("NEXT_REDIRECT") || msg.includes("NEXT_NOT_FOUND")) {
      throw error;
    }
    return msg;
  }
  return fallback;
}
