import type { NextRequest } from "next/server";

type SupabaseConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

export function hasTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const configuredOrigin = process.env.APP_ORIGIN;
  const expectedOrigin = configuredOrigin ? new URL(configuredOrigin).origin : request.nextUrl.origin;
  return origin === expectedOrigin;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function supabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error("Supabase is not configured. Copy .env.example to .env.local and add your project keys.");
  }
  return { url: url.replace(/\/$/, ""), anonKey, serviceRoleKey };
}

export async function supabaseServiceRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = supabaseConfig();
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = await response.text();
  if (!response.ok) {
    let message = body;
    try {
      const parsed = JSON.parse(body) as { message?: string; details?: string };
      message = parsed.message || parsed.details || body;
    } catch {
      // Keep the raw database response if it is not JSON.
    }
    throw new Error(message || `Supabase request failed (${response.status}).`);
  }
  return (body ? JSON.parse(body) : null) as T;
}

export async function verifySeller(accessToken: string): Promise<boolean> {
  const { url, anonKey } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return false;
  const user = (await response.json()) as { email?: string };
  const sellerEmail = process.env.SELLER_EMAIL?.trim().toLowerCase();
  return Boolean(sellerEmail && user.email?.trim().toLowerCase() === sellerEmail);
}