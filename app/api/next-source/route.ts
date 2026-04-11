import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { pickNextSource } from "@/lib/repos/next-source";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = req.headers.get("x-intake-secret");
  if (!secret || secret !== env().INTAKE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const source = await pickNextSource();
    return NextResponse.json(source);
  } catch (err) {
    console.error("[next-source] failed:", err);
    return NextResponse.json({ error: "pick failed" }, { status: 503 });
  }
}
