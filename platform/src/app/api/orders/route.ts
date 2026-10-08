import { NextRequest, NextResponse } from "next/server";
import { hasTrustedOrigin, supabaseServiceRequest } from "@/lib/supabase-rest";

type OrderRequest = {
  customerName?: string;
  email?: string;
  phone?: string;
  fulfillmentMethod?: "shipping" | "pickup";
  address?: string;
  cityPostal?: string;
  items?: Array<{ productId?: string; quantity?: number }>;
};

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  try {
    const payload = (await request.json()) as OrderRequest;
    const customerName = payload.customerName?.trim() ?? "";
    const email = payload.email?.trim() ?? "";
    const fulfillmentMethod = payload.fulfillmentMethod;
    const address = payload.address?.trim() ?? "";
    const cityPostal = payload.cityPostal?.trim() ?? "";
    const items = payload.items ?? [];

    if (customerName.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || !["shipping", "pickup"].includes(fulfillmentMethod ?? "") || (fulfillmentMethod === "shipping" && (address.length < 5 || cityPostal.length < 3))) {
      return NextResponse.json({ error: "Enter your name, a valid email, and the required fulfillment details." }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length < 1 || items.length > 30 || items.some((item) => !item.productId || !Number.isInteger(item.quantity) || (item.quantity ?? 0) < 1 || (item.quantity ?? 0) > 20)) {
      return NextResponse.json({ error: "Your bag contains an invalid listing or quantity." }, { status: 400 });
    }

    const identifier = process.env.PAYNOW_IDENTIFIER?.trim();
    const displayName = process.env.PAYNOW_DISPLAY_NAME?.trim();
    const qrImageUrl = process.env.PAYNOW_QR_IMAGE_URL?.trim();
    if (!identifier || !displayName || !qrImageUrl) {
      return NextResponse.json({ error: "The seller has not configured PayNow details yet." }, { status: 503 });
    }

    const order = await supabaseServiceRequest<{
      id: string;
      order_number: string;
      payment_reference: string;
      subtotal_sgd: number;
      shipping_sgd: number;
      total_sgd: number;
      expires_at: string;
    }>("rpc/create_pending_order", {
      method: "POST",
      body: JSON.stringify({
        p_customer_name: customerName,
        p_customer_email: email,
        p_customer_phone: payload.phone?.trim() || null,
        p_fulfillment_method: fulfillmentMethod,
        p_delivery_address: fulfillmentMethod === "shipping" ? address : null,
        p_city_postal: fulfillmentMethod === "shipping" ? cityPostal : null,
        p_items: items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
      }),
    });

    return NextResponse.json({
      order,
      payment: { method: "PayNow", identifier, displayName, qrImageUrl },
      message: "Transfer the exact total and include the payment reference. Your items are reserved for 30 minutes while payment is confirmed.",
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create your order.";
    const status = message.includes("not configured") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}