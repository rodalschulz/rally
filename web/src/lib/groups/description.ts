export const GROUP_DESCRIPTION_MAX = 250;

/** Trim; empty → null; throws if over max. */
export function normalizeGroupDescription(
  raw: string | undefined | null,
): string | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  if (text.length > GROUP_DESCRIPTION_MAX) {
    throw new Error(
      `Descripción muy larga (máx. ${GROUP_DESCRIPTION_MAX} caracteres)`,
    );
  }
  return text;
}
