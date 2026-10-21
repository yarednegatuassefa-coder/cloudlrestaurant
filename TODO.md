# Cloud L — delivery status

**Public brand:** Cloud L. **Hours:** daily, 7:00 a.m.–9:00 p.m. **Address:** Queen Elizabeth II Street, Kebena, Addis Ababa. **Directions:** a professional Google Maps link, with the plus code kept inside the destination URL. **Telebirr:** +251 901 120 012, for manual transfers only.

## Live website — verified

- [x] Editorial Cloud L website and restaurant photography deployed to `cloudlrestaurant.com`.
- [x] Search-ready prerendered homepage with local restaurant metadata and `LocalBusiness` structured data.
- [x] Canonical host, robots.txt, sitemap.xml, and Cloud L SVG favicon verified over HTTP on 21 October 2026 (all 200; homepage and crawler files contain expected content).
- [x] Hours, Kebena address, public brand, click-to-call, and human-friendly directions CTA reflected on the site.

## Ordering release — implemented in local source, NOT yet deployed

- [x] Persistent cart and WhatsApp as a secondary, user-reviewed fallback.
- [x] Guest checkout with name and phone; pickup, delivery, or dine-in; delivery address/landmark/notes only for delivery; optional guests/table; special instructions; explicit WhatsApp-status opt-in.
- [x] Cash preference and manual Telebirr preference. Customer is told to wait for staff confirmation and final total before transferring.
- [x] Server-side catalog validation and subtotal recalculation; the browser-supplied subtotal is not trusted.
- [x] Server-generated order reference and a separate unguessable private tracking token; only its hash is stored. Tracking reveals customer-safe items/status/confirmed totals, not phone or address.
- [x] Customer tracking timeline, staff-set ETA, Telebirr transfer card shown only after staff confirms the order/total, transaction-reference submission, and staff verification before marking paid.
- [x] Protected staff login/session, order queue, status controls, delivery-fee/ETA input, 15-second refresh, optional sound and browser notification prompts, manual WhatsApp update links for opted-in customers.
- [x] Neon order schema migration has been applied; migration grants server-role access only. The API and UI are implemented locally and type-check/build successfully.
- [ ] Publish these local code changes to the production Vercel deployment and verify the production flow.
- [ ] Required first: grant the Vercel integration permission to the project’s team scope. The connector currently returns 403 for that scope; an environment-variable write was denied. No production test order was placed.
- [ ] After access, configure production `DATABASE_URL` (pooled Neon URL), `STAFF_PASSWORD`, and `STAFF_SESSION_SECRET`; keep values secret and server-only. Confirm deployment health before enabling customer orders.
- [ ] Test the complete live journey with a clearly identified, low-value test request, verify its private tracking link and staff board, then remove/cancel test data as appropriate. Do not submit until production configuration succeeds.

## Owner confirmation still needed before claiming/configuring

- [ ] Confirm the Telebirr recipient display name is exactly “Cloud L” in the receiving wallet before instructing customers to transfer.
- [ ] Define delivery zones, availability, and fees; staff currently confirms fee manually before customer payment.
- [ ] Approve cancellation/refund rules and provide a CBE Birr receiving account/name only if it should be offered. No unconfirmed CBE number or automated payment gateway is published.
- [ ] Confirm whether a specific customer-service WhatsApp recipient differs from the public/Telebirr number. No staff destination is assumed from the public number.

## Later improvements (not required for first online ordering)

- [ ] Staff-managed sold-out controls/UI, although the API checks availability when present.
- [ ] Verified allergen and dietary attributes/filters; do not guess food facts.
- [ ] Customer reorder/favorites, editing and cancellation workflow.
- [ ] Automatic WhatsApp/Telegram notifications only after consent, sender/channel setup, and cost approval; current free approach is staff-initiated manual sending.
- [ ] Kitchen display, printing, role separation, audit log, inventory/shift handover, offline mode.

## Free-first boundary

Keep Neon on its free tier and monitor quotas. Do not enable paid hosting, payment gateway, WhatsApp Business API, or add-ons without the owner’s explicit approval. Manual Telebirr transfer is not an online payment integration.