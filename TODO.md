# Cloud L — status

**Public brand:** Cloud L. **Hours:** daily, 7:00 a.m.–9:00 p.m. **Address:** Queen Elizabeth II Street, Kebena, Addis Ababa. **Telebirr:** +251 901 120 012, manual transfers only; recipient name shown to customers: Lidia. **Bunna Bank QR:** Cloud L Trading PLC, merchant ID 450043. **Dashen Bank:** Cloud L Trading PLC, account 0194970006011.

Last updated: 27 October 2026.

## Live and tested on production (cloudlrestaurant.com)

- Website with food menu (43 dishes, English and Amharic) and drinks menu (21 drinks).
- Menu shows last-updated date, “Fasting = Plant-based / Vegan-friendly”, breakfast tags (Fatira, Special Fatira, Special Ful, Chechebsa, Special Chechebsa), and “All prices include VAT”.
- Persistent cart, guest checkout, pickup / delivery / dine-in, cash and manual Telebirr, WhatsApp order fallback.
- Order saved in Neon (Postgres). Vercel variables set: `DATABASE_URL`, `STAFF_PASSWORD`, `STAFF_SESSION_SECRET`. Never print or commit their values.
- Customer order reference and private tracking link (token hash stored, not the token).
- Staff page at `/#staff`: login, order list, and status changes through received, needs clarification, confirmed, preparing, ready for pickup, out for delivery, delivered, completed, declined, and cancelled.
- Customer tracking page shows every status change and the update log.
- Needs-clarification workflow is live (commit `f1a6ee0`): staff can record a required customer-facing message in the private tracking history, then confirm or decline after resolving it. The action does not automatically send a message.
- Neon migration 003 is applied in production without changing existing orders. The live bundle contains the staff controls and tracking copy; anonymous staff API access correctly returns 401. No production test order was created for this feature.
- Manual Telebirr path tested: card appears after staff confirm; transaction reference submitted; staff verification marks it paid. Nothing is marked paid from a reference alone.
- Staff alerts tested: sound and browser notification fire while the staff tab is in the background (pinned tab, Chrome set to keep the site active).
- Staff-initiated WhatsApp update links for opted-in customers.
- Local SEO: metadata, structured data, `robots.txt`, and `sitemap.xml`.

## New payment-method update — deployed; Bunna/Dashen order paths not end-to-end tested

- Checkout now offers cash, Telebirr, Bunna Bank QR, and a separate Dashen Bank transfer.
- The Bunna Bank merchant QR is for Cloud L Trading PLC, merchant ID 450043. Its asset was regenerated from the exact payload decoded from the owner-supplied photo, then decoded again to verify the payload match.
- Dashen Bank account 0194970006011 is under Cloud L Trading PLC. Bunna and Dashen are separate payment destinations.
- Transfer instructions are shown only after staff confirms the order and exact total. Customers may submit a transaction reference; staff must verify it against the correct receiving account before marking it paid.
- Neon migration 002 was tested on a temporary branch and applied to production with approval. It expands the accepted method values without changing existing order records.
- Commit `d1d8912` is pushed to `main` and is live. The public payment-method API exposes only method IDs, labels, and types; recipient/account/QR details are read from the order’s private snapshot after staff confirmation, or by authenticated staff.
- No production order or payment was placed to test Bunna or Dashen. Do not treat those paths as end-to-end payment-verified.

## Test data

Test orders placed on production (TEST, TEST2, TEST3 and the first CL-261021 order) must stay cancelled or declined. There is one Neon database shared by Preview and production.

## Deployed; first staff validation still pending

- Production Neon migration 004 is applied after temporary-branch validation. It seeded Cash, Telebirr, Bunna QR, and Dashen; added a versioned QR path, immutable order snapshots, and payment-method settings/audit tables. Read-only production checks found all four methods, zero unknown payment methods, and zero empty snapshots. No order or payment was created for this release.
- Commit `e931e54` is pushed to `main` and live. The production JavaScript bundle matches the local build byte-for-byte.
- Follow-up commit `91f81b4` fixes text-only edits for destinations with existing QR assets; new destinations start disabled and must be explicitly reviewed and enabled.
- The public payment-method API returns only method IDs, labels, and payment types for all four seeded methods. The admin settings endpoint returns 401 without staff authentication. The versioned QR asset returns HTTP 200 as a 1,462-byte PNG.
- No staff login, real order, transfer, or production payment was used for this smoke test. The bank paths and payment-before-preparation behavior have not been exercised with a live order.

- **Payment destination settings (live):** In the authenticated staff dashboard, owner-authorized staff can add, edit, and disable manual bank/wallet methods; enter the display name, bank/institution, recipient, account/phone/merchant ID, instructions, and optional QR image. Keep method IDs immutable and disable rather than delete methods. Checkout receives only enabled method names; transfer details appear on the private tracking page only after staff confirms the order and total. Each order keeps the exact destination snapshot selected at order time, unaffected by later edits. Log each create, edit, and enable/disable action. All transfers remain manual and require staff verification.
- **Payment-to-preparation gate (live):** For a manual-transfer order, the dashboard and API block **Start preparing** until staff verify funds in the matching Cloud L account and mark the payment paid. Cash orders may proceed without prepayment. Payment verification does not automatically advance order status; after verification staff explicitly selects **Start preparing**. The gate is code-reviewed but has not been tested using a production order.

## In progress — staff sold-out controls

- Staff can mark any of the 65 purchasable options (43 food items and 22 drink/size options) sold out or available from the authenticated dashboard; the item IDs match the server catalog and drink sizes stay distinct. Persist overrides in the existing Neon `menu_availability` table with the update timestamp and generic `Cloud L staff` label; the shared login cannot attribute an individual staff member.
- An absent availability row means available; only `is_sold_out=true` is sold out. The public menu shows a clear sold-out state and disables adding that item/size. Staff changes affect new orders and current customer pages after refresh.
- The order API takes the same per-item transaction lock as a staff toggle, then rechecks every selected menu ID before inserting an order. This serializes a first-time sold-out override against checkout; stale carts that lose the race get a helpful error and no order is created.
- Existing production availability table was read-only checked on 26 October: 0 overrides and 0 items marked sold out. Do not change a real item's availability during validation.

## Implemented on feature branch — one-tap reorder (checklist item 31; not deployed)

- From the existing private tracking link of a completed, delivered, declined, or cancelled order, let the customer add that order's items to the persistent cart in one action; do not offer reorder while an order is still being processed.
- Match historical lines to current catalog entries and current prices, preserve each item/size and quantity, and identify items that are discontinued or currently sold out instead of silently adding them. If current availability cannot be verified, leave the cart unchanged and ask the customer to try again.
- If the current cart already contains items, ask before replacing it; never silently discard the customer's cart.
- Reorder creates only a new cart. It does not reuse the old order's customer, delivery, fulfillment, payment, or confirmation details; checkout and its server-side availability check are still required.
- Keep the feature on a separate GitHub feature branch. Do not write to the shared Neon database, submit a production order, or deploy to production while implementing it.
- Local validation: production build passed; targeted lint passed with 0 warnings/errors; full lint passed with 0 errors and 15 warnings in unchanged project files. No browser checkout, Neon write, production order, or deployment was performed.

## Implemented on feature branch — favorites / heart system (checklist item 32; not deployed)

- Add a subtle, refined heart control to food and drink menu cards. It must be keyboard-accessible, expose its saved state to assistive technology, and use bilingual English/Amharic labels that fit Cloud L's navy, terracotta, and cream design.
- Let customers filter each menu to their saved favorites, show the relevant saved-item count, and explain when the filtered list is empty.
- Save only stable menu item IDs in this browser's local storage; do not require an account or send favorites to the server, Neon, analytics, or third parties. Explain that favorites are device/browser-specific.
- Drink favorites refer to the menu item, not a selected wine size; preserve the existing variant, sold-out, and add-to-cart behavior.
- Food category links follow the sections visible after search and Favorites filtering so they never point to hidden content.
- Add automated browser E2E tests for bilingual food/drink heart toggles, keyboard activation, local persistence, favorites-only filters, empty states, and category links. Run them against local Vite with menu availability mocked; do not access Neon or create orders.
- Keep this change on a separate feature branch. Do not write to Neon, submit a production order, or deploy to production.
- Validation: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` passed 3/3; the command first type-checks the config/specs. Production build passed; full lint had 0 errors and 15 existing warnings; npm reported 0 vulnerabilities. Tests ran against local Vite with availability mocked. No Neon write, production order, production service, deployment, or manual screen-reader test was performed.

## Not built yet

- Allergen and dietary data and filters (do not guess food facts; verify with the kitchen).
- Telegram ordering button.
- CBE Birr (only if the owner provides a real account and name).
- Automatic delivery fee calculator (staff set the fee per order).
- QR pickup pass for real orders (the Manus demo was never in this repo).
- Dish descriptions (checklist items 5 and 6).
- Customer order editing and cancellation flow.
- Automatic WhatsApp / Telegram messages, kitchen display, printing, audit log, inventory.

## Needs owner decision

- Delivery zones, availability and fees.
- Cancellation and refund rules.
- Whether to offer CBE Birr, and with which account.
- Whether a staff WhatsApp number differs from the public number.
- A real nearby landmark for the address (checklist item 7).
- Keshir Ginger Tea: confirm the name with the kitchen. Guder or Gouder wine spelling.
- Native-speaker proofreading of all Amharic text.

## Rules

- Free first: check free options before any paid tool. No subscription, payment gateway, WhatsApp Business API or add-on without the owner's explicit approval.
- Keep Neon on its free tier and watch quotas.
- Known Neon role limitation: `cloudl_app` inherits `neon_superuser`; SQL revocation was denied on a temporary branch, so it remains unchanged. Object-level grants in migration 004 do not remove inherited privileges; revisit only through a supported Neon role-management path.
- No sending, publishing, purchasing, deleting or live account changes without human approval.
- Manual transfer references are not proof of payment; staff must verify in the receiving account.
- Fee, price and provider terms stay “needs verification” until checked from current official sources.
- Try a task manually before automating it.
