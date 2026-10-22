# Cloud L — status

**Public brand:** Cloud L. **Hours:** daily, 7:00 a.m.–9:00 p.m. **Address:** Queen Elizabeth II Street, Kebena, Addis Ababa. **Telebirr:** +251 901 120 012, manual transfers only; recipient name shown to customers: Lidia. **Bunna Bank QR:** Cloud L Trading PLC, merchant ID 450043. **Dashen Bank:** Cloud L Trading PLC, account 0194970006011.

Last updated: 22 October 2026.

## Live and tested on production (cloudlrestaurant.com)

- Website with food menu (43 dishes, English and Amharic) and drinks menu (21 drinks).
- Menu shows last-updated date, “Fasting = Plant-based / Vegan-friendly”, breakfast tags (Fatira, Special Fatira, Special Ful, Chechebsa, Special Chechebsa), and “All prices include VAT”.
- Persistent cart, guest checkout, pickup / delivery / dine-in, cash and manual Telebirr, WhatsApp order fallback.
- Order saved in Neon (Postgres). Vercel variables set: `DATABASE_URL`, `STAFF_PASSWORD`, `STAFF_SESSION_SECRET`. Never print or commit their values.
- Customer order reference and private tracking link (token hash stored, not the token).
- Staff page at `/#staff`: login, order list, status changes (received, confirmed, preparing, ready, completed), cancel.
- Customer tracking page shows every status change and the update log.
- Manual Telebirr path tested: card appears after staff confirm; transaction reference submitted; staff verification marks it paid. Nothing is marked paid from a reference alone.
- Staff alerts tested: sound and browser notification fire while the staff tab is in the background (pinned tab, Chrome set to keep the site active).
- Staff-initiated WhatsApp update links for opted-in customers.
- Local SEO: metadata, structured data, `robots.txt`, and `sitemap.xml`.

## New payment-method update — code committed locally, deployment pending

- Checkout adds separate manual payment choices for Bunna Bank QR and Dashen Bank, in addition to cash and Telebirr.
- The Bunna Bank merchant QR was regenerated from the exact payload decoded from the owner-supplied photo; it is associated with Cloud L Trading PLC, merchant ID 450043.
- Dashen Bank is a separate account, 0194970006011, under Cloud L Trading PLC.
- Transfer instructions appear only after staff confirms the order and exact total. Customers may submit a transaction reference; staff must verify payment against the correct receiving account before marking it paid.
- Neon migration 002 was tested on a temporary branch and applied to production with approval. It expands allowed payment-method values without changing existing order records.
- The code, QR asset, and migration still need to be pushed/deployed. The new Bunna/Dashen paths have not been end-to-end tested in production; do not place a payment or test transfer for them without owner approval.

## Test data

Test orders placed on production (TEST, TEST2, TEST3 and the first CL-261021 order) must stay cancelled or declined. There is one Neon database shared by Preview and production.

## Not built yet

- “Needs clarification” order status (not in the database).
- Staff sold-out toggle (database table exists; no screen).
- Allergen and dietary data and filters (do not guess food facts; verify with the kitchen).
- Telegram ordering button.
- CBE Birr (only if the owner provides a real account and name).
- Automatic delivery fee calculator (staff set the fee per order).
- QR pickup pass for real orders (the Manus demo was never in this repo).
- Dish descriptions (checklist items 5 and 6).
- Customer reorder, favorites, order editing, cancellation flow.
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

- Free first: check free options before any paid tool. No subscription, payment gateway, WhatsApp Business API or add-on without the owner’s explicit approval.
- Keep Neon on its free tier and watch quotas.
- No sending, publishing, purchasing, deleting or live account changes without human approval.
- Manual transfer references are not proof of payment; staff must verify in the receiving account.
- Fee, price and provider terms stay “needs verification” until checked from current official sources.
- Try a task manually before automating it.
