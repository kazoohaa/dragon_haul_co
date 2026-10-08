import { NextRequest, NextResponse } from "next/server";
import { hasTrustedOrigin, supabaseServiceRequest, verifySeller } from "@/lib/supabase-rest";

async function authorized(request: NextRequest) {
  const token = request.cookies.get("seller_access_token")?.value;
  return Boolean(token && await verifySeller(token).catch(() => false));
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: "Sign in as the seller to view orders." }, { status: 401 });
  try {
    await supabaseServiceRequest<number>("rpc/expire_pending_paynow_orders", { method: "POST", body: "{}" });
    const orders = await supabaseServiceRequest<unknown[]>("orders?select=*,order_items(*)&order=created_at.desc");
    return NextResponse.json(orders, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load orders.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  if (!(await authorized(request))) return NextResponse.json({ error: "Sign in as the seller to update orders." }, { status: 401 });
  try {
    const { orderId, action } = (await request.json()) as { orderId?: string; action?: string };
    if (!orderId || !["paid", "cancelled"].includes(action ?? "")) {
      return NextResponse.json({ error: "Choose a valid order and action." }, { status: 400 });
    }
    const updated = await supabaseServiceRequest<unknown>("rpc/resolve_paynow_order", {
      method: "POST",
      body: JSON.stringify({ p_order_id: orderId, p_action: action }),
    });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update this order.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}