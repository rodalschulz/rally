export { isSessionChatOpen } from "@/lib/sessions/windows";

export const CHAT_BODY_MAX = 500;

export type ChatMessageDTO = {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  displayName: string;
  shortName: string;
  hue: number;
};

export function canPostSessionChat(status: string | undefined | null): boolean {
  return status === "going" || status === "maybe";
}

export function normalizeChatBody(raw: string): string {
  const body = raw.trim();
  if (!body) throw new Error("Mensaje vacío");
  if (body.length > CHAT_BODY_MAX) {
    throw new Error(`Mensaje muy largo (máx. ${CHAT_BODY_MAX})`);
  }
  return body;
}
