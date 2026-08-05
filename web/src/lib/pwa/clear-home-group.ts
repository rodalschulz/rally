import { cookies } from "next/headers";
import { HOME_GROUP_COOKIE } from "@/lib/pwa/home-group";

/** Drop the PWA home-group cookie (stale slug, leave, delete). */
export async function clearHomeGroupCookie() {
  const jar = await cookies();
  jar.delete(HOME_GROUP_COOKIE);
}

/** Clear only if the cookie still points at this slug. */
export async function clearHomeGroupCookieIfSlug(slug: string) {
  const jar = await cookies();
  if (jar.get(HOME_GROUP_COOKIE)?.value === slug) {
    jar.delete(HOME_GROUP_COOKIE);
  }
}
