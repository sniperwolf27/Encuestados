import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/admin/login", request.url));
  response.cookies.delete(COOKIE_NAME);
  return response;
}
