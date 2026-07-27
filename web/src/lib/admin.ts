import { prisma } from "@/lib/db";

/** App-wide admin flag on User (independent of group owner). */
export async function userIsAppAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return Boolean(user?.isAdmin);
}
