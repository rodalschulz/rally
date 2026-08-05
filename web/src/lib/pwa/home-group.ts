/** Cookie used to open the PWA straight into the last group hub (Fechas). */
export const HOME_GROUP_COOKIE = "rally_home_group";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

export function isSafeGroupSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= 64 && SLUG_RE.test(slug);
}
