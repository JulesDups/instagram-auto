import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  COOKIE_MAX_AGE_SECONDS,
  comparePassword,
  createSessionCookie,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  let password: string | undefined;
  let next = "/overview";

  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as {
      password?: string;
      next?: string;
    };
    password = body.password;
    if (body.next && body.next.startsWith("/")) next = body.next;
  } else {
    const form = await req.formData();
    const pwd = form.get("password");
    const nextValue = form.get("next");
    if (typeof pwd === "string") password = pwd;
    if (typeof nextValue === "string" && nextValue.startsWith("/")) {
      next = nextValue;
    }
  }

  if (!password || !comparePassword(password)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "1");
    if (next && next !== "/overview") loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const token = createSessionCookie();
  const response = NextResponse.redirect(new URL(next, req.url), {
    status: 303,
  });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
