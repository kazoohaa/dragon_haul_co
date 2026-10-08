import { connection, NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseServiceRequest } from "@/lib/supabase-rest";
import type { Listing } from "@/lib/catalog";
import { sampleListings } from "@/lib/catalog";

export async function GET() {
  await connection();
  if (!isSupabaseConfigured()) {
    return NextResponse.json(sampleListings, { headers: { "x-demo-catalogue": "true" } });
  }
  try {
    await supabaseServiceRequest<number>("rpc/expire_pending_paynow_orders", { method: "POST", body: "{}" });
    const products = await supabaseServiceRequest<Listing[]>(
      "products?select=id,type,category,name,condition,detail,price_sgd,market_price_sgd,set_name,set_code,finish,image_url,stock,reserved,is_active&order=type.asc,name.asc",
    );
    return NextResponse.json(products);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load listings.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}