"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type OrderItem = { id: string; name_snapshot: string; condition_snapshot: string; set_snapshot: string | null; finish_snapshot: string | null; unit_price_sgd: number; quantity: number; line_total_sgd: number };
type SellerOrder = { id: string; order_number: string; payment_reference: string; customer_name: string; customer_email: string; customer_phone: string | null; fulfillment_method: "shipping" | "pickup"; delivery_address: string | null; city_postal: string | null; subtotal_sgd: number; shipping_sgd: number; total_sgd: number; status: "pending_payment" | "paid" | "cancelled" | "expired"; created_at: string; expires_at: string; paid_at: string | null; order_items: OrderItem[] };
type Filter = "all" | "pending_payment" | "paid" | "closed";

const sgd = (amount: number) => new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD" }).format(amount);
const statusLabel: Record<SellerOrder["status"], string> = { pending_payment: "Awaiting PayNow", paid: "Paid", cancelled: "Cancelled", expired: "Expired" };

export default function SellerOrders() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeOrder, setActiveOrder] = useState("");

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        setAuthenticated(true);
        const orderResponse = await fetch("/api/admin/orders", { cache: "no-store" });
        if (!orderResponse.ok) throw new Error("Could not load seller orders.");
        setOrders((await orderResponse.json()) as SellerOrder[]);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load seller orders."))
      .finally(() => setCheckingSession(false));
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Sign-in failed.");
      setAuthenticated(true);
      setPassword("");
      await refreshOrders();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshOrders() {
    const response = await fetch("/api/admin/orders", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load orders.");
    setOrders(result as SellerOrder[]);
  }

  async function updateOrder(orderId: string, action: "paid" | "cancelled") {
    setActiveOrder(orderId);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, action }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update this order.");
      await refreshOrders();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update this order.");
    } finally {
      setActiveOrder("");
    }
  }

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setOrders([]);
  }

  const shownOrders = orders.filter((order) => filter === "all" || (filter === "closed" ? order.status === "cancelled" || order.status === "expired" : order.status === filter));
  const pendingCount = orders.filter((order) => order.status === "pending_payment").length;
  const paidTotal = orders.filter((order) => order.status === "paid").reduce((total, order) => total + order.total_sgd, 0);

  if (checkingSession) return <main className="admin-shell"><p className="admin-loading">Checking seller session…</p></main>;

  if (!authenticated) return <main className="admin-shell">
    <Link className="admin-back" href="/">← Back to shop</Link>
    <section className="login-panel">
      <p className="eyebrow">PRIVATE SELLER AREA</p><h1>Seller sign in</h1>
      <p className="login-intro">Sign in with the seller account configured in Supabase to review PayNow orders.</p>
      <form className="seller-login" onSubmit={signIn}>
        <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="checkout-button" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </section>
  </main>;

  return <main className="admin-shell">
    <header className="admin-topbar"><Link className="wordmark" href="/">dragon haul<span>.</span></Link><div><span className="seller-stamp">SELLER ORDERS</span><button type="button" className="quiet-button" onClick={signOut}>Sign out</button></div></header>
    <section className="admin-content">
      <div className="admin-title-row"><div><p className="eyebrow">YOUR SHOP, IN ONE PLACE</p><h1>Orders</h1></div><button className="quiet-button" type="button" onClick={() => refreshOrders().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Refresh failed."))}>Refresh ↻</button></div>
      <div className="order-stats"><div><span>Awaiting payment</span><strong>{pendingCount}</strong></div><div><span>Paid order total</span><strong>{sgd(paidTotal)}</strong></div><div><span>All orders</span><strong>{orders.length}</strong></div></div>
      <div className="order-toolbar"><div className="filter-tabs" aria-label="Filter orders">{([["all", "All"], ["pending_payment", "Pending"], ["paid", "Paid"], ["closed", "Closed"]] as [Filter, string][]).map(([key, label]) => <button type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}{key === "pending_payment" && pendingCount > 0 ? ` · ${pendingCount}` : ""}</button>)}</div><span>{shownOrders.length} orders</span></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {shownOrders.length === 0 ? <div className="orders-empty"><strong>No orders here yet.</strong><span>New customer orders will appear here after checkout.</span></div> : <div className="orders-list">{shownOrders.map((order) => <article className="order-card" key={order.id}>
        <div className="order-card-head"><div><p className="order-number">{order.order_number}</p><span>{new Date(order.created_at).toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short" })}</span></div><span className={`status-pill status-${order.status}`}>{statusLabel[order.status]}</span></div>
        <div className="order-card-body">
          <div className="order-items"><h2>Items</h2>{order.order_items.map((item) => <div className="order-item" key={item.id}><span><strong>{item.name_snapshot}</strong><small>{item.condition_snapshot}{item.set_snapshot ? ` · ${item.set_snapshot}` : ""}{item.finish_snapshot ? ` · ${item.finish_snapshot === "foil" ? "foil" : "non-foil"}` : ""} · qty {item.quantity}</small></span><strong>{sgd(item.line_total_sgd)}</strong></div>)}<div className="order-total"><span>Total · SGD</span><strong>{sgd(order.total_sgd)}</strong></div></div>
          <div className="customer-details"><h2>Customer & fulfillment</h2><strong>{order.customer_name}</strong><a href={`mailto:${order.customer_email}`}>{order.customer_email}</a>{order.customer_phone && <a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a>}<div className="fulfillment-detail"><strong>{order.fulfillment_method === "pickup" ? "Pickup" : "Ship to customer"}</strong>{order.fulfillment_method === "pickup" ? <span>Arrange a time and place with the buyer at your convenience.</span> : <address>{order.delivery_address}<br />{order.city_postal}</address>}</div><div className="payment-reference"><span>PayNow reference</span><strong>{order.payment_reference}</strong></div></div>
        </div>
        {order.status === "pending_payment" && <div className="order-actions"><p>Check your bank transfer before confirming payment.</p><div><button type="button" className="confirm-payment" disabled={activeOrder === order.id} onClick={() => updateOrder(order.id, "paid")}>{activeOrder === order.id ? "Updating…" : "Confirm payment"}</button><button type="button" className="cancel-order" disabled={activeOrder === order.id} onClick={() => updateOrder(order.id, "cancelled")}>Cancel order</button></div></div>}
        {order.status === "paid" && <p className="paid-note">Payment confirmed{order.paid_at ? ` · ${new Date(order.paid_at).toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short" })}` : ""}</p>}
      </article>)}</div>}
    </section>
  </main>;
}