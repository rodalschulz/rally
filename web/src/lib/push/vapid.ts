import webpush from "web-push";

let configured = false;

export function getVapidPublicKey(): string | null {
  const key = process.env.VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

/** web-push requires a URL; bare emails become mailto:… */
export function normalizeVapidSubject(raw: string): string {
  const subject = raw.trim();
  if (!subject) return subject;
  if (/^(mailto:|https?:)/i.test(subject)) return subject;
  if (subject.includes("@")) return `mailto:${subject}`;
  return subject;
}

/** Configure web-push once per process. Returns false if env is incomplete. */
export function ensureVapidConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subjectRaw = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subjectRaw) return false;
  const subject = normalizeVapidSubject(subjectRaw);
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export { webpush };
