"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { sampleListings, type Listing } from "@/lib/catalog";

type Mode = "personal" | "mtg";
type FulfillmentMethod = "shipping" | "pickup";
type CreatedOrder = {
  order: { id: string; order_number: string; payment_reference: string; fulfillment_method: FulfillmentMethod; subtotal_sgd: number; shipping_sgd: number; total_sgd: number; expires_at: string };
  payment: { method: string; identifier: string; displayName: string; qrImageUrl: string };
  message: string;
};

const formatSgd = (amount: number) => new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD" }).format(amount);
const categories = ["Everything", "Clothes", "K-pop", "Accessories", "Sold items"];

export default function Home() {
  const [listings, setListings] = useState<Listing[]>(sampleListings);
  const [mode, setMode] = useState<Mode>("personal");
  const [category, setCategory] = useState("Everything");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("featured");
  const [setFilter, setSetFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [finishFilter, setFinishFilter] = useState("all");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>("shipping");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dataNotice, setDataNotice] = useState("Sample catalogue shown. Connect Supabase to publish your inventory.");

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Sample catalogue shown. Set up Supabase to load your inventory.");
        const records = (await response.json()) as Listing[];
        setListings(records);
        setDataNotice(response.headers.get("x-demo-catalogue") ? "Demo listings only. Configure Supabase and replace these samples before accepting orders." : "");
      })
      .catch((error: unknown) => setDataNotice(error instanceof Error ? error.message : "Sample catalogue shown."));
  }, []);

  const visibleListings = useMemo(() => {
    const available = listings.filter((item) => item.is_active && item.stock - item.reserved > 0);
    const source = mode === "personal"
      ? category === "Sold items"
        ? listings.filter((item) => item.type === "personal" && (!item.is_active || item.stock <= item.reserved))
        : available.filter((item) => item.type === "personal" && (category === "Everything" || item.category === category))
      : available.filter((item) => item.type === "mtg");
    const search = query.trim().toLowerCase();
    let result = source.filter((item) => `${item.name} ${item.category} ${item.condition} ${item.detail} ${item.set_name ?? ""} ${item.set_code ?? ""} ${item.finish ?? ""}`.toLowerCase().includes(search));
    if (mode === "mtg") {
      if (setFilter !== "all") result = result.filter((item) => item.set_name === setFilter);
      if (conditionFilter !== "all") result = result.filter((item) => item.condition === conditionFilter);
      if (finishFilter !== "all") result = result.filter((item) => item.finish === finishFilter);
    }
    if (sort === "price-low") result = [...result].sort((a, b) => a.price_sgd - b.price_sgd);
    if (sort === "price-high") result = [...result].sort((a, b) => b.price_sgd - a.price_sgd);
    if (sort === "market-low") result = [...result].sort((a, b) => (a.market_price_sgd ?? 0) - (b.market_price_sgd ?? 0));
    if (sort === "market-high") result = [...result].sort((a, b) => (b.market_price_sgd ?? 0) - (a.market_price_sgd ?? 0));
    if (sort === "name") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [listings, mode, category, query, sort, setFilter, conditionFilter, finishFilter]);

  const cartLines = listings.filter((item) => cart[item.id]);
  const cartCount = Object.values(cart).reduce((total, quantity) => total + quantity, 0);
  const subtotal = cartLines.reduce((total, item) => total + item.price_sgd * cart[item.id], 0);
  const shipping = fulfillmentMethod === "pickup" || subtotal === 0 || subtotal >= 75 ? 0 : 4.9;
  const sets = [...new Set(listings.filter((item) => item.type === "mtg").map((item) => item.set_name).filter(Boolean))] as string[];
  const conditions = [...new Set(listings.filter((item) => item.type === "mtg").map((item) => item.condition))];

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setCategory("Everything");
    setQuery("");
    setSort("featured");
    setSetFilter("all");
    setConditionFilter("all");
    setFinishFilter("all");
  }

  function addToCart(item: Listing) {
    if (!item.is_active || item.stock - item.reserved < (cart[item.id] ?? 0) + 1) return;
    setCart((current) => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }));
  }

  function setQuantity(item: Listing, change: number) {
    setCart((current) => {
      const quantity = (current[item.id] ?? 0) + change;
      if (quantity <= 0) {
        const next = { ...current };
        delete next[item.id];
        return next;
      }
      return { ...current, [item.id]: Math.min(quantity, item.stock - item.reserved) };
    });
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setCheckoutError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.get("name"), email: form.get("email"), phone: form.get("phone"),
          fulfillmentMethod,
          address: form.get("address"), cityPostal: form.get("cityPostal"),
          items: cartLines.map((item) => ({ productId: item.id, quantity: cart[item.id] })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create the order.");
      setCreatedOrder(result as CreatedOrder);
      setCart({});
      fetch("/api/products", { cache: "no-store" })
        .then(async (productResponse) => productResponse.ok ? { records: (await productResponse.json()) as Listing[], demo: productResponse.headers.get("x-demo-catalogue") === "true" } : null)
        .then((result) => { if (result) { setListings(result.records); setDataNotice(result.demo ? "Demo listings only. Configure Supabase and replace these samples before accepting orders." : ""); } })
        .catch(() => undefined);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Could not create the order.");
    } finally {
      setBusy(false);
    }
  }

  function closeCheckout() {
    setCheckoutOpen(false);
    setCreatedOrder(null);
    setCheckoutError("");
  }

  return (
    <main className="shop-shell">
      <div className="announcement">{mode === "personal" ? "A LITTLE LESS NEW, A LOT MORE YOU · FREE SHIPPING OVER S$75" : "MTG SINGLES · CONDITION DESCRIBED · FREE SHIPPING OVER S$75"}</div>
      <header className="topbar">
        <a className="wordmark" href="#top">dragon haul<span>.</span></a>
        <nav className="quick-nav" aria-label="Shop navigation">
          <button type="button" onClick={() => changeMode("personal")}>Personal shop</button>
          <button type="button" onClick={() => changeMode("mtg")}>MTG singles</button>
          <a href="/admin">Seller sign in</a>
        </nav>
        <div className="top-actions">
          <label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={mode === "mtg" ? "Search cards or sets" : "Find your thing"} aria-label="Search listings" /></label>
          <button className="bag-button" type="button" onClick={() => setCartOpen(true)}>Bag <span>{cartCount}</span></button>
        </div>
      </header>

      <div className="mode-tabs" role="group" aria-label="Choose a storefront">
        <button type="button" aria-pressed={mode === "personal"} onClick={() => changeMode("personal")}><strong>Personal Shop</strong><span>Clothes · K-pop · accessories</span></button>
        <button type="button" aria-pressed={mode === "mtg"} onClick={() => changeMode("mtg")}><strong>MTG Singles</strong><span>Magic: The Gathering cards</span></button>
      </div>

      <section className={`hero hero-${mode}`} id="top">
        <div className="hero-copy">
          <span className="eyebrow">{mode === "personal" ? "PERSONAL SHOP · GOOD FINDS, SECOND LIVES" : "MTG SINGLES · FIND YOUR NEXT DECK PIECE"}</span>
          <h1>{mode === "personal" ? "The good stuff finds its way around." : "Find the right card for your next deck."}</h1>
          <p>{mode === "personal" ? "Pre-loved treasures and brand-new favorites, picked one by one. No endless scroll. Just things worth keeping." : "Browse singles by set, condition, and finish. Compare market prices with the asking price before you add a card to your bag."}</p>
          <a className="hero-cta" href="#catalog">{mode === "personal" ? "Meet the latest finds" : "Browse the card catalogue"}<span aria-hidden="true">↘</span></a>
        </div>
        <div className="hero-image" role="img" aria-label={mode === "personal" ? "A curated secondhand leather bag" : "A Magic card from the singles catalogue"}>
          {mode === "personal" ? <img src="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1100&q=85" alt="" /> : <img src={listings.find((item) => item.id === "mtg-sol-ring")?.image_url ?? sampleListings[7].image_url} alt="" />}
          <span className="roundel">{mode === "personal" ? <>FOUND<br />FOR YOU<br />✳</> : <>FRESH<br />FROM THE<br />STACK<br />✳</>}</span>
        </div>
      </section>

      <div className="trust-strip"><span>One-offs, always</span><span>Condition checked</span><span>Ships with care</span><span>{mode === "personal" ? "New things, old stories" : "PayNow · SGD"}</span></div>

      <section className="catalog" id="catalog">
        <div className="catalog-heading">
          <div><p className="eyebrow">{mode === "personal" ? "FRESH FROM THE HAUL" : "SINGLE CARD CATALOGUE"}</p><h2>{mode === "personal" ? "Personal Shop" : "MTG Singles"}</h2><p className="muted-copy">{visibleListings.length} {mode === "mtg" ? "cards" : category === "Sold items" ? "sold listings" : "available finds"}</p></div>
          <label className="sort-field">Sort by<select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="featured">Featured</option><option value="price-low">Your price: low to high</option><option value="price-high">Your price: high to low</option>
            {mode === "mtg" && <><option value="market-low">Market: low to high</option><option value="market-high">Market: high to low</option></>}
            <option value="name">Name: A to Z</option>
          </select></label>
        </div>

        {mode === "personal" ? <div className="category-tabs" aria-label="Filter by category">{categories.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div> : <div className="card-filters">
          <label>Set<select value={setFilter} onChange={(event) => setSetFilter(event.target.value)}><option value="all">All sets</option>{sets.map((setName) => <option key={setName} value={setName}>{setName}</option>)}</select></label>
          <label>Condition<select value={conditionFilter} onChange={(event) => setConditionFilter(event.target.value)}><option value="all">Any condition</option>{conditions.map((condition) => <option key={condition}>{condition}</option>)}</select></label>
          <label>Finish<select value={finishFilter} onChange={(event) => setFinishFilter(event.target.value)}><option value="all">Foil & non-foil</option><option value="foil">Foil</option><option value="nonfoil">Non-foil</option></select></label>
          <p className="price-note">Example market prices until you connect a live pricing source.</p>
        </div>}

        {dataNotice && <p className="setup-notice">{dataNotice}</p>}
        {visibleListings.length === 0 ? <div className="empty-state"><strong>No listings found.</strong><span>Try another search or filter.</span></div> : mode === "personal" ? <div className="personal-grid">{visibleListings.map((item) => {
          const sold = !item.is_active || item.stock <= item.reserved;
          return <article className="personal-card" key={item.id}>
            <div className="personal-photo"><img src={item.image_url} alt={item.name} loading="lazy" /><span className="condition-tag">{sold ? "Sold" : item.condition}</span></div>
            <div className="personal-card-head"><div><span className="item-category">{item.category}</span><h3>{item.name}</h3></div><span className="item-price">{formatSgd(item.price_sgd)}</span></div>
            <div className="personal-card-foot"><span>{item.detail}</span>{sold ? <span className="sold-label">Sold</span> : <button type="button" onClick={() => addToCart(item)}>Add to bag +</button>}</div>
          </article>;
        })}</div> : <div className="singles-list">{visibleListings.map((item) => <article className="single-row" key={item.id}>
          <img className="single-art" src={item.image_url} alt={item.name} loading="lazy" />
          <div className="single-title"><h3>{item.name}</h3><span>{item.set_name} · {item.set_code}</span></div>
          <div className="single-condition"><span>{item.condition}</span><span>{item.finish === "foil" ? "Foil" : "Non-foil"}</span></div>
          <div className="single-price"><span>Market price</span><strong>{formatSgd(item.market_price_sgd ?? 0)}</strong></div>
          <div className="single-price asking"><span>Your price</span><strong>{formatSgd(item.price_sgd)}</strong></div>
          <button className="single-add" type="button" onClick={() => addToCart(item)}>Add to bag +</button>
        </article>)}</div>}
      </section>

      {mode === "personal" && <section className="promise-band"><h2>Good things deserve another go.</h2><p>Every pre-loved piece is checked and described honestly. New finds are chosen with the same care, then packed thoughtfully for their next home.</p></section>}
      <footer className="site-footer"><span>dragon haul co.</span><span>PayNow · Singapore dollars</span><a href="mailto:hello@dragonhaul.co">Say hello</a></footer>

      {cartOpen && <div className="scrim" onMouseDown={(event) => event.target === event.currentTarget && setCartOpen(false)}>
        <aside className="cart-panel" role="dialog" aria-modal="true" aria-labelledby="bag-heading">
          <div className="panel-heading"><h2 id="bag-heading">Your bag <span>({cartCount})</span></h2><button className="icon-close" type="button" aria-label="Close bag" onClick={() => setCartOpen(false)}>×</button></div>
          <div className="bag-lines">{cartLines.length === 0 ? <p className="bag-empty">Your bag is taking a little breather.<br />Go find it something good.</p> : cartLines.map((item) => <article className="bag-line" key={item.id}>
            <img src={item.image_url} alt="" /><div className="bag-info"><strong>{item.name}</strong><span>{formatSgd(item.price_sgd)} each</span><div className="quantity-stepper"><button type="button" aria-label={`Remove one ${item.name}`} onClick={() => setQuantity(item, -1)}>−</button><span>{cart[item.id]}</span><button type="button" aria-label={`Add one ${item.name}`} onClick={() => setQuantity(item, 1)}>+</button></div></div><strong className="line-total">{formatSgd(item.price_sgd * cart[item.id])}</strong>
          </article>)}</div>
          <div className="bag-summary">
            <div className="fulfillment-picker"><span>Fulfillment</span><div role="group" aria-label="Choose fulfillment method"><button type="button" aria-pressed={fulfillmentMethod === "shipping"} onClick={() => setFulfillmentMethod("shipping")}>Ship to me</button><button type="button" aria-pressed={fulfillmentMethod === "pickup"} onClick={() => setFulfillmentMethod("pickup")}>Pickup</button></div><p>{fulfillmentMethod === "pickup" ? "Free pickup. We’ll arrange a time and place that works for the seller after you order." : "Shipping is S$4.90, or free for orders over S$75."}</p></div>
            <div><span>Subtotal</span><strong>{formatSgd(subtotal)}</strong></div><div><span>{fulfillmentMethod === "pickup" ? "Pickup" : "Shipping"}</span><strong>{subtotal === 0 ? "—" : fulfillmentMethod === "pickup" ? "Free" : shipping === 0 ? "Free" : formatSgd(shipping)}</strong></div><button className="checkout-button" type="button" disabled={cartCount === 0} onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>Continue to checkout</button><p>PayNow transfer · no card details required</p>
          </div>
        </aside>
      </div>}

      {checkoutOpen && <div className="scrim checkout-scrim" onMouseDown={(event) => event.target === event.currentTarget && closeCheckout()}>
        <section className="checkout-panel" role="dialog" aria-modal="true" aria-labelledby="checkout-heading">
          <div className="panel-heading"><h2 id="checkout-heading">{createdOrder ? "Pay with PayNow" : fulfillmentMethod === "pickup" ? "Pickup details" : "Delivery details"}</h2><button className="icon-close" type="button" aria-label="Close checkout" onClick={closeCheckout}>×</button></div>
          {createdOrder ? <div className="paynow-confirmation">
            <span className="pending-chip">Payment pending · order reserved 30 min</span>
            <p>Order <strong>{createdOrder.order.order_number}</strong></p>
            <p>Pay <strong className="pay-total">{formatSgd(createdOrder.order.total_sgd)}</strong> to <strong>{createdOrder.payment.displayName}</strong> using PayNow.</p>
            <div className="paynow-qr"><img src={createdOrder.payment.qrImageUrl} alt="PayNow QR code" onError={(event) => { event.currentTarget.hidden = true; }} /><span>Scan with your banking app, or use the recipient details below.</span></div>
            <div className="reference-box"><span>PayNow UEN / mobile</span><strong>{createdOrder.payment.identifier}</strong></div>
            <div className="reference-box"><span>Payment reference (include exactly)</span><strong>{createdOrder.order.payment_reference}</strong></div>
            <div className="reference-box"><span>Order total</span><strong>{formatSgd(createdOrder.order.total_sgd)} SGD</strong></div>
            {createdOrder.order.fulfillment_method === "pickup" && <p className="manual-payment-note">Pickup is free. The seller will contact you to arrange a convenient time and place after payment is confirmed.</p>}
            {createdOrder.order.fulfillment_method === "shipping" && <p className="manual-payment-note">Your order will be shipped to the address provided. Shipping details are in your order confirmation.</p>}
            <p className="manual-payment-note">Your order stays pending until the seller checks the transfer in their bank account. Do not pay after the reservation expires.</p>
            <button className="checkout-button" type="button" onClick={closeCheckout}>Done</button>
          </div> : <form className="delivery-form" onSubmit={placeOrder}>
            <p className="form-intro">We’ll reserve your items for 30 minutes and show you a PayNow QR and payment reference. {fulfillmentMethod === "pickup" ? "The seller will arrange a convenient pickup time and place with you after payment." : "Your items will be shipped to your address."}</p>
            <label>Full name<input name="name" autoComplete="name" required minLength={2} /></label>
            <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
            <label>Phone number <span>(optional)</span><input name="phone" type="tel" autoComplete="tel" /></label>
            {fulfillmentMethod === "shipping" && <><label>Delivery address<input name="address" autoComplete="street-address" required minLength={5} /></label><label>City and postal code<input name="cityPostal" autoComplete="postal-code" required minLength={3} /></label></>}
            {checkoutError && <p className="form-error" role="alert">{checkoutError}</p>}
            <button className="checkout-button" type="submit" disabled={busy}>{busy ? "Creating order…" : `Place order · ${formatSgd(subtotal + shipping)}`}</button>
            <p className="fine-print">No card details are collected. Your order is not confirmed until PayNow is received and checked.</p>
          </form>}
        </section>
      </div>}
    </main>
  );
}
