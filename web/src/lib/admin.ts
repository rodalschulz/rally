import { getSession } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

/** App-wide admin flag on User (independent of group owner). Hits the DB — use for mutations. */
export async function userIsAppAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return Boolean(user?.isAdmin);
}

/**
 * Admin bit already stored on the Auth.js JWT at sign-in.
 * Page reads use this so navigation does not pay for another User query.
 */
export async function sessionIsAppAdmin(): Promise<boolean> {
  const session = await getSession();
  return Boolean(session?.user?.isAdmin);
}
