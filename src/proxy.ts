import { NextRequest, NextResponse } from "next/server";
import { resolveCanonicalHostRedirect } from "@/lib/canonicalHost";
import { resolveProgramsRedirect } from "@/lib/programsUrlCanonical";

export function proxy(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto");
  const hostRedirect = resolveCanonicalHostRedirect({
    host,
    proto,
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
  });
  if (hostRedirect) {
    return NextResponse.redirect(hostRedirect, 308);
  }

  const programsTarget = resolveProgramsRedirect(
    request.nextUrl.pathname,
    request.nextUrl.searchParams,
  );
  if (programsTarget) {
    const url = request.nextUrl.clone();
    url.pathname = programsTarget;
    url.search = "";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and Next internals.
     * Host redirects need site-wide coverage; programs query
     * canonicalization still only acts on /programs.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
