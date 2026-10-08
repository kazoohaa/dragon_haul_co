import { NextRequest, NextResponse } from "next/server";
import { hasTrustedOrigin, supabaseConfig, verifySeller } from "@/lib/supabase-rest";

const accessCookie = "seller_access_token";
const refreshCookie = "seller_refresh_token";

function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge };
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(accessCookie)?.value;
  const authenticated = token ? await verifySeller(token).catch(() => false) : false;
  return NextResponse.json({ authenticated }, { status: authenticated ? 200 : 401, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  try {
    const { email, password } = (await request.json()) as { email?: string; password?: string };
    if (!email || !password || email.trim().toLowerCase() !== process.env.SELLER_EMAIL?.trim().toLowerCase()) {
      return NextResponse.json({ error: "Seller sign-in failed." }, { status: 401 });
    }
    const { url, anonKey } = supabaseConfig();
    const signIn = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    if (!signIn.ok) return NextResponse.json({ error: "Seller sign-in failed." }, { status: 401 });
    const tokens = (await signIn.json()) as { access_token: string; expires_in?: number };
    if (!(await verifySeller(tokens.access_token))) {
      return NextResponse.json({ error: "This account is not authorized as the shop seller." }, { status: 403 });
    }
    const response = NextResponse.json({ authenticated: true });
    const maxAge = Math.max(60, Math.min(tokens.expires_in ?? 3600, 3600));
    response.cookies.set(accessCookie, tokens.access_token, cookieOptions(maxAge));
    response.cookies.set(refreshCookie, "", cookieOptions(0));
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Seller sign-in is unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(accessCookie, "", cookieOptions(0));
  response.cookies.set(refreshCookie, "", cookieOptions(0));
  return response;
}