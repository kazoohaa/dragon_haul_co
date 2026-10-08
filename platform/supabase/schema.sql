create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  type text not null check (type in ('personal', 'mtg')),
  category text not null,
  name text not null,
  condition text not null,
  detail text not null default '',
  price_sgd numeric(10, 2) not null check (price_sgd >= 0),
  market_price_sgd numeric(10, 2),
  set_name text,
  set_code text,
  finish text check (finish in ('foil', 'nonfoil')),
  image_url text not null,
  stock integer not null default 1 check (stock >= 0),
  reserved integer not null default 0 check (reserved >= 0 and reserved <= stock),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  payment_reference text not null unique,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  fulfillment_method text not null default 'shipping' check (fulfillment_method in ('shipping', 'pickup')),
  delivery_address text,
  city_postal text,
  currency text not null default 'SGD' check (currency = 'SGD'),
  subtotal_sgd numeric(10, 2) not null,
  shipping_sgd numeric(10, 2) not null,
  total_sgd numeric(10, 2) not null,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists fulfillment_method text not null default 'shipping';
alter table public.orders alter column delivery_address drop not null;
alter table public.orders alter column city_postal drop not null;

do $$
begin
  alter table public.orders add constraint orders_fulfillment_method_check check (fulfillment_method in ('shipping', 'pickup'));
exception when duplicate_object then
  null;
end;
$$;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  name_snapshot text not null,
  condition_snapshot text not null,
  set_snapshot text,
  finish_snapshot text,
  unit_price_sgd numeric(10, 2) not null,
  quantity integer not null check (quantity > 0),
  line_total_sgd numeric(10, 2) not null
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

insert into public.products (id, type, category, name, condition, detail, price_sgd, market_price_sgd, set_name, set_code, finish, image_url, stock, reserved, is_active)
values
  ('linen-shirt', 'personal', 'Clothes', 'Sunday linen shirt', 'Like new', 'Size M · airy cotton-linen', 31, null, null, null, null, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=82', 1, 0, true),
  ('retro-sneakers', 'personal', 'Clothes', 'Retro court sneakers', 'Pre-loved', 'EU 39 · lots of life left', 36, null, null, null, null, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=82', 1, 0, true),
  ('kpop-album', 'personal', 'K-pop', 'K-pop album · photocard edition', 'Brand new', 'Sealed · photocard included', 29, null, null, null, null, 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=700&q=82', 1, 0, true),
  ('leather-tote', 'personal', 'Accessories', 'Everyday leather tote', 'Very good', 'Soft grain · roomy inside', 42, null, null, null, null, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=700&q=82', 1, 0, true),
  ('gold-watch', 'personal', 'Accessories', 'Gold-tone mini watch', 'Very good', 'Adjustable strap · keeps time', 28, null, null, null, null, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=82', 1, 0, true),
  ('summer-sunnies', 'personal', 'Accessories', 'Sunny-day sunglasses', 'Brand new', 'UV400 lenses · includes case', 24, null, null, null, null, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=700&q=82', 0, 0, false),
  ('denim-jacket', 'personal', 'Clothes', 'Easy vintage denim', 'Good', 'Size L · broken-in softness', 48, null, null, null, null, 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=700&q=82', 0, 0, false),
  ('mtg-sol-ring', 'mtg', 'Magic singles', 'Sol Ring', 'Near Mint', '', 1.50, 1.85, 'Commander Masters', 'CMM', 'nonfoil', 'https://api.scryfall.com/cards/named?exact=Sol%20Ring&format=image&version=small', 8, 0, true),
  ('mtg-lightning-bolt', 'mtg', 'Magic singles', 'Lightning Bolt', 'Near Mint', '', 2.10, 2.40, 'Foundations', 'FDN', 'foil', 'https://api.scryfall.com/cards/named?exact=Lightning%20Bolt&format=image&version=small', 4, 0, true),
  ('mtg-counterspell', 'mtg', 'Magic singles', 'Counterspell', 'Lightly Played', '', 0.50, 0.72, 'Commander Masters', 'CMM', 'nonfoil', 'https://api.scryfall.com/cards/named?exact=Counterspell&format=image&version=small', 12, 0, true),
  ('mtg-birds-of-paradise', 'mtg', 'Magic singles', 'Birds of Paradise', 'Moderately Played', '', 7.00, 8.25, 'Eighth Edition', '8ED', 'nonfoil', 'https://api.scryfall.com/cards/named?exact=Birds%20of%20Paradise&format=image&version=small', 2, 0, true),
  ('mtg-thoughtseize', 'mtg', 'Magic singles', 'Thoughtseize', 'Near Mint', '', 10.50, 11.60, 'Double Masters 2022', '2X2', 'foil', 'https://api.scryfall.com/cards/named?exact=Thoughtseize&format=image&version=small', 3, 0, true),
  ('mtg-sheoldred', 'mtg', 'Magic singles', 'Sheoldred, the Apocalypse', 'Near Mint', '', 58.00, 62.00, 'Dominaria United', 'DMU', 'nonfoil', 'https://api.scryfall.com/cards/named?exact=Sheoldred%2C%20the%20Apocalypse&format=image&version=small', 1, 0, true)
on conflict (id) do nothing;

create or replace function public.expire_pending_paynow_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired record;
  v_count integer := 0;
begin
  for v_expired in select id from public.orders where status = 'pending_payment' and expires_at <= now() for update loop
    update public.products p set reserved = greatest(0, p.reserved - oi.quantity)
      from public.order_items oi where oi.order_id = v_expired.id and p.id = oi.product_id;
    update public.orders set status = 'expired', updated_at = now() where id = v_expired.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

drop function if exists public.create_pending_order(text, text, text, text, text, jsonb);

create or replace function public.create_pending_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_fulfillment_method text,
  p_delivery_address text,
  p_city_postal text,
  p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_product public.products%rowtype;
  v_order_id uuid := gen_random_uuid();
  v_order_number text := 'DH-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_reference text := 'DH' || to_char(now(), 'YYMMDD') || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_subtotal numeric(10, 2) := 0;
  v_shipping numeric(10, 2);
  v_lines jsonb := '[]'::jsonb;
begin
  if length(trim(coalesce(p_customer_name, ''))) < 2 or length(trim(coalesce(p_customer_email, ''))) < 5
     or coalesce(p_fulfillment_method, '') not in ('shipping', 'pickup')
     or (p_fulfillment_method = 'shipping' and (length(trim(coalesce(p_delivery_address, ''))) < 5 or length(trim(coalesce(p_city_postal, ''))) < 3)) then
    raise exception 'Please provide valid contact and fulfillment details.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    raise exception 'Your bag is empty or contains too many different listings.';
  end if;

  perform public.expire_pending_paynow_orders();

  for v_item in
    select product_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as item(product_id text, quantity integer)
    group by product_id
  loop
    if v_item.product_id is null or v_item.quantity < 1 or v_item.quantity > 20 then
      raise exception 'A listing quantity is invalid.';
    end if;
    select * into v_product from public.products where id = v_item.product_id and is_active = true for update;
    if not found or v_product.stock - v_product.reserved < v_item.quantity then
      raise exception 'One of your listings is no longer available in that quantity.';
    end if;
    update public.products set reserved = reserved + v_item.quantity where id = v_product.id;
    v_subtotal := v_subtotal + v_product.price_sgd * v_item.quantity;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'condition', v_product.condition,
      'set_name', v_product.set_name,
      'finish', v_product.finish,
      'unit_price', v_product.price_sgd,
      'quantity', v_item.quantity
    ));
  end loop;

  v_shipping := case when p_fulfillment_method = 'pickup' or v_subtotal >= 75 then 0 else 4.90 end;
  insert into public.orders (id, order_number, payment_reference, customer_name, customer_email, customer_phone, fulfillment_method, delivery_address, city_postal, subtotal_sgd, shipping_sgd, total_sgd, status, expires_at)
  values (v_order_id, v_order_number, v_reference, trim(p_customer_name), lower(trim(p_customer_email)), nullif(trim(coalesce(p_customer_phone, '')), ''), p_fulfillment_method, nullif(trim(coalesce(p_delivery_address, '')), ''), nullif(trim(coalesce(p_city_postal, '')), ''), v_subtotal, v_shipping, v_subtotal + v_shipping, 'pending_payment', now() + interval '30 minutes');

  insert into public.order_items (order_id, product_id, name_snapshot, condition_snapshot, set_snapshot, finish_snapshot, unit_price_sgd, quantity, line_total_sgd)
  select v_order_id, (line->>'product_id'), line->>'name', line->>'condition', nullif(line->>'set_name', ''), nullif(line->>'finish', ''), (line->>'unit_price')::numeric, (line->>'quantity')::integer, (line->>'unit_price')::numeric * (line->>'quantity')::integer
  from jsonb_array_elements(v_lines) as line;

  return jsonb_build_object('id', v_order_id, 'order_number', v_order_number, 'payment_reference', v_reference, 'fulfillment_method', p_fulfillment_method, 'subtotal_sgd', v_subtotal, 'shipping_sgd', v_shipping, 'total_sgd', v_subtotal + v_shipping, 'expires_at', now() + interval '30 minutes');
end;
$$;

create or replace function public.resolve_paynow_order(p_order_id uuid, p_action text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_line record;
begin
  if p_action not in ('paid', 'cancelled') then
    raise exception 'Unsupported order action.';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status <> 'pending_payment' then
    raise exception 'This order is not awaiting payment.';
  end if;
  if v_order.expires_at <= now() then
    for v_line in select product_id, quantity from public.order_items where order_id = v_order.id loop
      update public.products set reserved = greatest(0, reserved - v_line.quantity) where id = v_line.product_id;
    end loop;
    update public.orders set status = 'expired', updated_at = now() where id = v_order.id returning * into v_order;
    return v_order;
  end if;
  for v_line in select product_id, quantity from public.order_items where order_id = v_order.id loop
    if p_action = 'paid' then
      update public.products set reserved = greatest(0, reserved - v_line.quantity), stock = stock - v_line.quantity where id = v_line.product_id;
    else
      update public.products set reserved = greatest(0, reserved - v_line.quantity) where id = v_line.product_id;
    end if;
  end loop;
  update public.orders set status = p_action, paid_at = case when p_action = 'paid' then now() else null end, updated_at = now()
    where id = v_order.id returning * into v_order;
  return v_order;
end;
$$;

revoke all on function public.create_pending_order(text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.resolve_paynow_order(uuid, text) from public, anon, authenticated;
revoke all on function public.expire_pending_paynow_orders() from public, anon, authenticated;
grant execute on function public.create_pending_order(text, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.resolve_paynow_order(uuid, text) to service_role;
grant execute on function public.expire_pending_paynow_orders() to service_role;