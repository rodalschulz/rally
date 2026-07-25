"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** One soft refresh on mount so soft-nav doesn't show a stale Fecha payload. */
export function FreshOnMount() {
  const router = useRouter();
  const did = useRef(false);

  useEffect(() => {
    if (did.current) return;
    did.current = true;
    router.refresh();
  }, [router]);

  return null;
}
