import { NextRequest, NextResponse } from "next/server";
import { getPathForCategory, parseProgramLevelFilter } from "@/lib/programLevelCategories";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== "/programs") {
    return NextResponse.next();
  }

  const rawLevel = request.nextUrl.searchParams.get("level") ?? undefined;
  const level = parseProgramLevelFilter(rawLevel);
  if (level === "all") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/programs/${getPathForCategory(level)}`;
  url.search = "";
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: "/programs",
};
