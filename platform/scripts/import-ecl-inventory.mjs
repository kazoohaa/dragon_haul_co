import { readFile } from "node:fs/promises";

const inventoryFile = "C:/Users/samis/Downloads/cards_i wanna sell (lorwyn eclipsed).txt";
const environmentFile = new URL("../.env.local", import.meta.url);

function readEnvironment(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    return match ? [[match[1], match[2].trim()]] : [];
  }));
}

function productId(name, collectorNumber) {
  return `mtg-ecl-${collectorNumber}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

const [inventorySource, environmentSource] = await Promise.all([
  readFile(inventoryFile, "utf8"),
  readFile(environmentFile, "utf8"),
]);
const environment = readEnvironment(environmentSource);
if (!environment.SUPABASE_URL || !environment.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local.");
}

const products = inventorySource.trim().split(/\r?\n/).map((line) => {
  const match = line.match(/^(\d+)x (.+?) \(ecl\) (\d+)( \*F\*)? \[(.+)]$/i);
  if (!match) throw new Error(`Could not parse inventory line: ${line}`);
  const [, quantity, name, collectorNumber, foil, category] = match;
  return {
    id: productId(name, collectorNumber),
    type: "mtg",
    category: "Magic singles",
    name,
    condition: "Near Mint",
    detail: category,
    price_sgd: 0,
    market_price_sgd: null,
    set_name: "Lorwyn Eclipsed",
    set_code: "ECL",
    finish: foil ? "foil" : "nonfoil",
    image_url: `https://api.scryfall.com/cards/ecl/${collectorNumber}?format=image&version=small`,
    stock: Number(quantity),
    reserved: 0,
    is_active: true,
  };
});

const response = await fetch(`${environment.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/products?on_conflict=id`, {
  method: "POST",
  headers: {
    apikey: environment.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${environment.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  },
  body: JSON.stringify(products),
});

if (!response.ok) throw new Error(`Supabase import failed: ${await response.text()}`);
const inserted = await response.json();
console.log(`Imported ${inserted.length} Lorwyn Eclipsed listings (${products.reduce((total, product) => total + product.stock, 0)} cards total).`);
