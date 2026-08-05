"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { HOME_GROUP_COOKIE } from "@/lib/pwa/home-group";

/**
 * Soft-navigate into a group hub instead of a server redirect.
 * Keeps the root layout (and PwaBootSplash) mounted so iOS does not
 * flash white between documents.
 */
export function HomeGroupGate({ slug }: { slug: string }) {
  const router = useRouter();

  useEffect(() => {
    const maxAge = 60 * 60 * 24 * 400;
    document.cookie = `${HOME_GROUP_COOKIE}=${encodeURIComponent(slug)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
    router.replace(`/grupos/${slug}`);
  }, [slug, router]);

  return null;
}
