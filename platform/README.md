# dragon haul co. platform

Next.js storefront for Personal Shop and MTG Singles, with PayNow manual transfer and a private seller order dashboard.

## Local setup

1. Create a Supabase project and run `supabase/schema.sql` in its SQL Editor.
2. In Supabase Authentication, create the seller user using an email and password. Set the same email as `SELLER_EMAIL` below.
3. Copy `.env.example` to `.env.local` and fill in the Supabase project URL, anon key, service-role key, app origin, seller email, and PayNow recipient details. Keep `.env.local` private; never commit the service-role key.
4. Put your bank-generated PayNow QR image at `public/paynow-qr.png`, or change `PAYNOW_QR_IMAGE_URL` to an HTTPS image URL.
5. Use Node.js 22.13 or later, install packages, and start the development server:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000/` for the storefront and `http://localhost:3000/admin` for seller orders.

## PayNow flow

Checkout creates a pending SGD order and reserves inventory for 30 minutes. The buyer sees your configured QR, recipient, exact total, and payment reference. The seller checks their bank account and confirms payment in `/admin`; only then is stock deducted. Cancelling an order releases its reservation. This direct-transfer flow does not automatically verify deposits or collect card data.

Buyers can choose shipping or free pickup in the bag. Pickup does not require them to enter an address; the seller dashboard labels it for coordination, and the seller arranges a convenient pickup time and place directly with the buyer after the order.

## Before launch

- Replace all sample listings and illustrative MTG market prices in `src/lib/catalog.ts` and `supabase/schema.sql` with your real inventory and prices.
- Use a real bank-generated QR and confirm its recipient details before taking orders.
- Configure Supabase Auth and restrict seller access to your account.
- Review privacy, shipping, and refund policies for your location.
- Deploy the Next.js app to a Node-compatible host and set the same environment variables there.
