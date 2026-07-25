import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

export function hashGroupPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyGroupPassword(
  password: string,
  passwordHash: string,
): boolean {
  return bcrypt.compareSync(password, passwordHash);
}

export function newInviteCode(): string {
  return nanoid(12);
}

/** slugify name + short suffix for uniqueness */
export function makeSlug(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const stem = base || "grupo";
  return `${stem}-${nanoid(6)}`;
}
