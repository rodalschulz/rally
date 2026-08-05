import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { HOME_GROUP_COOKIE, isSafeGroupSlug } from "@/lib/pwa/home-group";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname, searchParams } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/availability") ||
    // Push APIs return 401 themselves; allow the request through auth middleware.
    pathname.startsWith("/api/push") ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/splash/") ||
    pathname === "/sw.js";

  if (!isLoggedIn && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  // Open PWA/home into last group hub without a client-visible redirect
  // (avoids the iOS white flash between `/` and Fechas).
  if (
    isLoggedIn &&
    pathname === "/" &&
    !searchParams.has("discover") &&
    !searchParams.has("error")
  ) {
    const slug = req.cookies.get(HOME_GROUP_COOKIE)?.value;
    if (slug && isSafeGroupSlug(slug)) {
      const url = req.nextUrl.clone();
      url.pathname = `/grupos/${slug}`;
      const res = NextResponse.rewrite(url);
      res.cookies.set(HOME_GROUP_COOKIE, slug, homeGroupCookieAttrs());
      return res;
    }
  }

  const groupMatch = pathname.match(/^\/grupos\/([^/]+)/);
  if (groupMatch?.[1] && isSafeGroupSlug(groupMatch[1])) {
    const res = NextResponse.next();
    res.cookies.set(HOME_GROUP_COOKIE, groupMatch[1], homeGroupCookieAttrs());
    return res;
  }

  return NextResponse.next();
});

function homeGroupCookieAttrs() {
  return {
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    sameSite: "lax" as const,
  };
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
