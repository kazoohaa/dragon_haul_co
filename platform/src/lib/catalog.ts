export type Listing = {
  id: string;
  type: "personal" | "mtg";
  category: string;
  name: string;
  condition: string;
  detail: string;
  price_sgd: number;
  market_price_sgd: number | null;
  set_name: string | null;
  set_code: string | null;
  finish: "foil" | "nonfoil" | null;
  image_url: string;
  stock: number;
  reserved: number;
  is_active: boolean;
};

const personalImage = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=82`;

const scryfallImage = (name: string) =>
  `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&format=image&version=small`;

export const sampleListings: Listing[] = [
  { id: "linen-shirt", type: "personal", category: "Clothes", name: "Sunday linen shirt", condition: "Like new", detail: "Size M · airy cotton-linen", price_sgd: 31, market_price_sgd: null, set_name: null, set_code: null, finish: null, image_url: personalImage("photo-1521572163474-6864f9cf17ab"), stock: 1, reserved: 0, is_active: true },
  { id: "retro-sneakers", type: "personal", category: "Clothes", name: "Retro court sneakers", condition: "Pre-loved", detail: "EU 39 · lots of life left", price_sgd: 36, market_price_sgd: null, set_name: null, set_code: null, finish: null, image_url: personalImage("photo-1542291026-7eec264c27ff"), stock: 1, reserved: 0, is_active: true },
  { id: "kpop-album", type: "personal", category: "K-pop", name: "K-pop album · photocard edition", condition: "Brand new", detail: "Sealed · photocard included", price_sgd: 29, market_price_sgd: null, set_name: null, set_code: null, finish: null, image_url: personalImage("photo-1614613535308-eb5fbd3d2c17"), stock: 1, reserved: 0, is_active: true },
  { id: "leather-tote", type: "personal", category: "Accessories", name: "Everyday leather tote", condition: "Very good", detail: "Soft grain · roomy inside", price_sgd: 42, market_price_sgd: null, set_name: null, set_code: null, finish: null, image_url: personalImage("photo-1548036328-c9fa89d128fa"), stock: 1, reserved: 0, is_active: true },
  { id: "gold-watch", type: "personal", category: "Accessories", name: "Gold-tone mini watch", condition: "Very good", detail: "Adjustable strap · keeps time", price_sgd: 28, market_price_sgd: null, set_name: null, set_code: null, finish: null, image_url: personalImage("photo-1523275335684-37898b6baf30"), stock: 1, reserved: 0, is_active: true },
  { id: "summer-sunnies", type: "personal", category: "Accessories", name: "Sunny-day sunglasses", condition: "Brand new", detail: "UV400 lenses · includes case", price_sgd: 24, market_price_sgd: null, set_name: null, set_code: null, finish: null, image_url: personalImage("photo-1511499767150-a48a237f0083"), stock: 0, reserved: 0, is_active: false },
  { id: "denim-jacket", type: "personal", category: "Clothes", name: "Easy vintage denim", condition: "Good", detail: "Size L · broken-in softness", price_sgd: 48, market_price_sgd: null, set_name: null, set_code: null, finish: null, image_url: personalImage("photo-1544441893-675973e31985"), stock: 0, reserved: 0, is_active: false },
  { id: "mtg-sol-ring", type: "mtg", category: "Magic singles", name: "Sol Ring", condition: "Near Mint", detail: "", price_sgd: 1.5, market_price_sgd: 1.85, set_name: "Commander Masters", set_code: "CMM", finish: "nonfoil", image_url: scryfallImage("Sol Ring"), stock: 8, reserved: 0, is_active: true },
  { id: "mtg-lightning-bolt", type: "mtg", category: "Magic singles", name: "Lightning Bolt", condition: "Near Mint", detail: "", price_sgd: 2.1, market_price_sgd: 2.4, set_name: "Foundations", set_code: "FDN", finish: "foil", image_url: scryfallImage("Lightning Bolt"), stock: 4, reserved: 0, is_active: true },
  { id: "mtg-counterspell", type: "mtg", category: "Magic singles", name: "Counterspell", condition: "Lightly Played", detail: "", price_sgd: 0.5, market_price_sgd: 0.72, set_name: "Commander Masters", set_code: "CMM", finish: "nonfoil", image_url: scryfallImage("Counterspell"), stock: 12, reserved: 0, is_active: true },
  { id: "mtg-birds-of-paradise", type: "mtg", category: "Magic singles", name: "Birds of Paradise", condition: "Moderately Played", detail: "", price_sgd: 7, market_price_sgd: 8.25, set_name: "Eighth Edition", set_code: "8ED", finish: "nonfoil", image_url: scryfallImage("Birds of Paradise"), stock: 2, reserved: 0, is_active: true },
  { id: "mtg-thoughtseize", type: "mtg", category: "Magic singles", name: "Thoughtseize", condition: "Near Mint", detail: "", price_sgd: 10.5, market_price_sgd: 11.6, set_name: "Double Masters 2022", set_code: "2X2", finish: "foil", image_url: scryfallImage("Thoughtseize"), stock: 3, reserved: 0, is_active: true },
  { id: "mtg-sheoldred", type: "mtg", category: "Magic singles", name: "Sheoldred, the Apocalypse", condition: "Near Mint", detail: "", price_sgd: 58, market_price_sgd: 62, set_name: "Dominaria United", set_code: "DMU", finish: "nonfoil", image_url: scryfallImage("Sheoldred, the Apocalypse"), stock: 1, reserved: 0, is_active: true },
];