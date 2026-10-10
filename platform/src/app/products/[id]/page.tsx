"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { type Listing } from "@/lib/catalog";

const formatSgd = (amount: number) => new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD" }).format(amount);

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Listing | undefined>();
  const [loaded, setLoaded] = useState(false);
  const [added, setAdded] = useState(false);
  const [bag, setBag] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const savedCart = window.localStorage.getItem("dragon-haul-cart");
      return savedCart ? JSON.parse(savedCart) as Record<string, number> : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<Listing[]> : Promise.reject())
      .then((items) => setProduct(items.find((item) => item.id === params.id)))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [params.id]);

  if (!product && !loaded) return <main className="product-page"><p>Loading product…</p></main>;
  if (!product) return <main className="product-page"><Link href="/" className="back-link">← Back to shop</Link><h1>Product not found</h1><p>This listing may have been removed.</p></main>;

  const available = Math.max(0, product.stock - product.reserved);
  const sold = !product.is_active || available === 0;

  function addToBag() {
    if (sold) return;
    const nextBag = { ...bag, [product.id]: Math.min((bag[product.id] ?? 0) + 1, available) };
    setBag(nextBag);
    window.localStorage.setItem("dragon-haul-cart", JSON.stringify(nextBag));
    setAdded(true);
  }

  const bagCount = Object.values(bag).reduce((total, quantity) => total + quantity, 0);

  return <main className="product-page">
    <header className="product-topbar"><Link href="/" className="product-wordmark">dragon haul<span>.</span></Link><nav aria-label="Shop navigation"><Link href="/#catalog">Personal shop</Link><Link href="/?shop=mtg#catalog">MTG singles</Link></nav><Link href="/?bag=1" className="detail-bag">Bag <span>{bagCount}</span></Link></header>
    <Link href="/" className="back-link">← Back to shop</Link>
    <article className="product-detail">
      <div className="product-detail-image"><img src={product.image_url} alt={product.name} /><span className={`product-status ${sold ? "is-sold" : ""}`}>{sold ? "Sold out" : product.condition}</span></div>
      <div className="product-detail-copy">
        <p className="eyebrow">{product.type === "mtg" ? "MTG SINGLE" : product.category}</p>
        <h1>{product.name}</h1>
        <div className="detail-pricing"><p className="detail-price">{formatSgd(product.price_sgd)}</p>{product.type === "mtg" && product.market_price_sgd !== null && <p className="market-price">Market price {formatSgd(product.market_price_sgd)}</p>}</div>
        <dl className="product-facts">
          <div><dt>Condition</dt><dd>{product.condition}</dd></div>
          {product.set_name && <div><dt>Set</dt><dd>{product.set_name}{product.set_code ? ` · ${product.set_code}` : ""}</dd></div>}
          {product.finish && <div><dt>Finish</dt><dd>{product.finish === "foil" ? "Foil" : "Non-foil"}</dd></div>}
          <div><dt>Availability</dt><dd><span className={`availability-dot ${sold ? "is-sold" : ""}`} />{sold ? "Sold out" : `${available} ready to ship`}</dd></div>
        </dl>
        {product.detail && <p className="product-description">{product.detail}</p>}
        {sold ? <Link href="/" className="detail-cta">Browse other listings</Link> : <div className="detail-actions"><button type="button" className="detail-cta" onClick={addToBag}>{added ? "Added to bag" : "Add to bag"}</button><Link href={added ? "/?bag=1" : "/"} className="continue-shopping">{added ? "View bag in shop" : "Continue shopping"}</Link></div>}
      </div>
    </article>
  </main>;
}
