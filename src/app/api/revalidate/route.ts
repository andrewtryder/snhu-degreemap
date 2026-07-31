import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Server misconfiguration: REVALIDATE_SECRET is missing" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!token || token !== secret) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing bearer token" },
      { status: 401 }
    );
  }

  try {
    (revalidateTag as unknown as (tag: string) => void)("program-data");
    return NextResponse.json({
      revalidated: true,
      tag: "program-data",
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `Revalidation error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
