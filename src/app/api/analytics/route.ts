import { NextResponse } from "next/server";
import { requireAuthCookie } from "@/lib/auth";
import { getAnalyticsData } from "@/lib/analytics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getAnalyticsData();

  return NextResponse.json(
    data,
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
