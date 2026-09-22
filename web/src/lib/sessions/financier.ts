/**
 * Who paid the court (`financierId`).
 * Creating a fecha defaults to the creator. Only an app admin may pick
 * someone else at create or edit, and only a current group member.
 * An unchanged id is kept even if that person already left the group.
 */
export function resolveFinancierId(input: {
  currentFinancierId: string;
  submittedFinancierId: string;
  isAppAdmin: boolean;
  memberIds: readonly string[];
}): { ok: true; financierId: string } | { ok: false; error: string } {
  const submitted = input.submittedFinancierId.trim();
  if (
    !input.isAppAdmin ||
    submitted === "" ||
    submitted === input.currentFinancierId
  ) {
    return { ok: true, financierId: input.currentFinancierId };
  }
  if (!input.memberIds.includes(submitted)) {
    return {
      ok: false,
      error: "El financiador tiene que ser miembro del grupo",
    };
  }
  return { ok: true, financierId: submitted };
}
