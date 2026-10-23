# Cloud L Restaurant — online ordering plan

**Owner direction:** The owner delegated product and implementation decisions (“full free reign”), asked for a professional order flow that supports home delivery, and prefers free workarounds. This plan is the first release, not a promise that paid payment or messaging services are free.

**Current state (24 October 2026):** The redesigned public website and base ordering flow are live. The latest upstream checklist records `DATABASE_URL`, `STAFF_PASSWORD`, and `STAFF_SESSION_SECRET` configured in Vercel and the manual Telebirr order path tested in production. Commit `d1d8912` adds separate Bunna Bank QR and Dashen Bank manual-transfer choices; they are live, but neither bank path has been end-to-end tested with a production order or payment. Commit `f1a6ee0` adds the needs-clarification staff workflow and private tracking message; Neon migration 003 is applied. The new bundle and protected staff endpoint were checked without creating a production order. Payment destinations remain code-managed; the staff dashboard has no settings screen to add or edit receiving details.

## Product decision

Online ordering becomes the primary channel. The current persistent cart, prefilled WhatsApp order draft, click-to-call contact, and Cloud L design remain available. The web order becomes the authoritative record; WhatsApp is a customer-support/fallback channel, not the database.

Support **pickup, home delivery, and optionally dine-in**. Guest checkout needs no account. Collect a reachable name and phone, order items, fulfillment choice, and special instructions. Ask for a delivery address, landmark, and delivery notes only for delivery; show guest count/table number only where useful. Do not invent delivery zones or charges. Until staff confirms availability and the delivery fee, show that the order is awaiting review and do not present an unverified final total.

After the server has durably recorded an order, show a human-readable order reference and a private tracking link. The tracking page exposes only the reference, selected items, customer-visible status, confirmed total and confirmed estimate; never show the customer’s phone/address or any other order. The order reference alone is not sufficient to access tracking; use a separate unguessable token and keep only its hash in the database.

## Payment decision — free-first, no false checkout

The owner provided three manual-transfer methods: Telebirr **+251 901 120 012**, with recipient name **Lidia** as shown in the current upstream tracking update; the Buna/Bunna Bank merchant QR for **Cloud L Trading PLC** (merchant ID **450043**); and a separate Dashen Bank account **0194970006011**, also under **Cloud L Trading PLC**. Keep these methods distinct. The QR asset was regenerated from the exact payload decoded from the supplied photo and independently decoded again to confirm the payload matches. None is an automated payment gateway. Instructions appear only after staff accepts the order and confirms any delivery fee and exact total. Customers may submit a transaction reference, but payment remains pending until staff checks the correct receiving account. A screenshot is not proof of payment; the Telebirr UI tells customers not to transfer if the displayed recipient is not Lidia.

Support **cash on pickup**, **cash on delivery**, and cash at the restaurant. Do not request a transfer before the order/final amount is confirmed. CBE Birr is not configured because the receiving number/account is not confirmed. Automatic online Telebirr checkout is a separate later phase: Ethio telecom’s official merchant information distinguishes free in-person proximity payments from online/remote API payments, which require API integration and a facilitation fee. Do not enable a paid gateway or paid plan without the owner’s approval.

Official source: [Ethio telecom — Telebirr merchant registration and payment types](https://www.ethiotelecom.et/telebirr/telebirr-registration-requirements-with-registration-form/).

## Free-first backend and cost boundary

Use **Neon Postgres Free** for durable order data, accessed only by Vercel serverless functions. Neon’s official pricing currently lists a $0 Free plan with **100 CU-hours per project per month** and **1 GB storage per project**. The new endpoint was created with `suspend_timeout_seconds=0`; Neon’s official guide says zero selects the default **300-second/five-minute idle suspension**. These quotas are finite; monitor usage and do not upgrade or enable paid usage without explicit owner authorization. Store the Neon connection only as a sensitive, server-side Vercel environment variable; never assume a Marketplace connection or expose it to the client.

The public React app must never receive the database URL or staff secret. The API revalidates every cart item ID, variant, and quantity using the shared menu catalog, calculates the subtotal on the server, and rejects unknown/sold-out items. A staff-only session protects order details and state changes. The database stores only fulfillment data the restaurant needs; do not put personal information in public HTML, analytics, or application logs.

Sources: [Neon pricing](https://neon.com/pricing), [Neon compute suspension settings](https://neon.com/docs/guides/ai-agent-integration), [Vercel storage overview](https://vercel.com/docs/storage).

## Customer tracking and staff notifications

Order lifecycle: **Received — awaiting staff confirmation → Confirmed → Preparing → Ready for pickup / Out for delivery → Completed / Delivered**. Staff may decline or cancel with a customer-visible explanation. The customer sees an ETA only after staff sets it. For a delivery order, staff confirms coverage/fee and the exact total before the customer is asked to pay.

The staff order board is the free, reliable source of truth while open. It refreshes/polls for new orders, provides a clear new-order badge and a sound alert after staff enables audio in the browser, and can request browser notifications. Browser alerts are device/session dependent; do not promise an alert while the dashboard is closed.

For WhatsApp, store an explicit customer opt-in. A staff **Send WhatsApp update** action opens a prefilled `wa.me` draft to the customer with the order reference, status, confirmed ETA if present, and private tracking link; the staff member checks and taps **Send**. Do not include the delivery address or payment data in the message. This user-initiated flow costs no WhatsApp API integration and does not send automatically. Automatic WhatsApp alerts to staff or customers require a configured WhatsApp Business Platform sender, recipient/consent handling, and possibly paid template messages; keep them deferred until the owner accepts the exact setup/cost. A staff WhatsApp recipient number is not assumed from the public/Telebirr number.

## Order reference and tracking-token design

Generate the reference server-side in the format **`CL-YYMMDD-XXXXXXXX`**, where the date is in `Africa/Addis_Ababa` and the final eight Crockford Base32 characters come from a cryptographically secure random value. Enforce a database unique constraint and retry on the extremely unlikely collision. Generate a separate 256-bit random tracking token; store only its SHA-256 hash. The customer URL uses a fragment route (`/#track/<token>`), and the tracking request sends the token in a POST body so it does not appear in the URL path or public page HTML. The reference is for conversation; the token grants status access.

## Design direction

Continue the established contemporary Ethiopian restaurant editorial style: warm cream, deep navy/charcoal, and copper/peach accents; the existing expressive display and readable interface type; generous whitespace and asymmetric editorial composition. Checkout, the tracking timeline, and staff tools should feel like Cloud L, not a generic SaaS template. Use quiet, tactile controls and restrained motion; do not obscure the page with a loud green payment button. The existing cloud-and-ribbon logo remains the wordmark/brand mark; the browser favicon has now been replaced with a compact version of that mark. Signature color: warm terracotta/copper. Brand essence: **an Addis neighborhood table rooted in Ethiopian cooking and generous shared meals**; personality: warm, grounded, composed. Voice: direct, welcoming, and honest—e.g. “We’ve received your order request; our team will confirm the details shortly.” / “Your order is ready for pickup.”

## Project structure

- `src/data/menuCatalog.ts` — one shared trusted catalog for food/drinks/variants, imported by UI and server API.
- `src/components/OrderCart.tsx` — preserve the accessible, persistent cart; make web checkout primary and WhatsApp fallback secondary.
- `src/components/CheckoutForm.tsx` — guest details, pickup/delivery/dine-in, special instructions, optional guest/table fields, payment choice, review and submit.
- `src/components/OrderTrackingPage.tsx` — private tracking view, method-specific transfer instructions, and manual transaction-reference submission.
- `src/components/StaffOrders.tsx` — authenticated staff queue, status/payment actions, ETA and delivery-fee confirmation, one-click WhatsApp drafts.
- `src/components/orderTypes.ts` — shared cart, order, status, and payment types.
- `api/orders.ts`, `api/orders/track.ts`, `api/orders/payment-reference.ts`, `api/admin/*` — Vercel endpoints for order creation, tracking, customer payment-reference submission, staff login and staff operations.
- `db/migrations/` — versioned schema for orders, line items, event history and sold-out state.
- Existing `scripts/prerender.mjs`, `index.html`, `public/robots.txt` and `public/sitemap.xml` remain the crawler-visible home experience; private track/admin views stay out of the route manifest and SEO content.

## Dependencies and remaining owner setup

- The Neon project is ready; `DATABASE_URL` is recorded in the latest upstream project checklist as configured in Vercel. Do not expose it in source, logs, client JS, or chat.
- The latest upstream project checklist records the staff password and session secret as configured in Vercel; keep both server-only and fail closed if either is missing.
- Delivery zones/fees, cancellation/refund wording, and the staff WhatsApp notification recipient still need operational confirmation. Until then, require staff review; do not invent fees or policies.
- Automatic WhatsApp, Telegram, CBE Birr, remote Telebirr API, paid gateways, refunds, and split payments are not required for the free-first release.
