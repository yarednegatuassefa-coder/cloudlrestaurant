# Cloud L Restaurant Ordering

Cloud L is a customer-facing restaurant ordering and operations application for **Cloud L Trading P.L.C.** in Kebena, Addis Ababa, Ethiopia. It combines an English/Amharic menu and guest ordering experience with order tracking and staff-side order management.

## Product capabilities

### Customer experience
- Browse food and drinks with ETB pricing, English and Amharic names, favorites, and menu-availability indicators.
- Build a cart and submit a guest order without creating an account.
- Choose pickup, delivery, or dine-in; provide contact details and optional delivery directions, guest count, table number, and special instructions.
- Select from payment preferences configured by the restaurant. Online checkout is not represented as completed payment.
- Receive a private order-tracking link and reference after the request is saved.
- Reorder or request edits to an eligible existing order.
- Use WhatsApp as an alternative order-request channel.

### Restaurant operations
- Review and manage incoming orders through the staff interface.
- Configure menu availability.
- Configure delivery territories and fees; the server performs delivery-zone matching and fee calculation.
- Review privacy-suppressed delivery demand/heatmap information.
- Review payment status and manually confirm payment/order details where required.

**Operational rule:** an online order is a request until Cloud L staff confirms availability and the final amount. Customers are explicitly told not to transfer money before confirmation.

## Technology

- React 19, TypeScript, and Vite
- Node.js API routes under `api/`
- PostgreSQL for persistent order and restaurant data
- Playwright for browser end-to-end tests
- Oxlint and TypeScript for static checks

## Local development

Requirements: Node.js compatible with the versions in the lockfile and npm.

```sh
npm ci
cp .env.example .env
# Fill in the required local database and application settings.
npm run dev
```

Vite prints the local development URL. Do not commit `.env`, database credentials, payment secrets, or private tracking tokens.

## Configuration

Start with [`.env.example`](.env.example). Configure the database connection and any optional monitoring/payment integration values required by the deployment environment. Keep production secrets in the hosting provider's encrypted environment-variable store, not in source control.

Database setup and operational notes are maintained in the repository's `db/`, `docs/`, and setup documents. Review those instructions before applying schema changes to a live database. **Release gate:** before deploying the server-side order-idempotency change, apply `db/migrations/008_order_create_idempotency.sql` to the target database and verify the `008_order_create_idempotency` row exists in `public.schema_migrations`. Do not deploy the application first; the order endpoint expects the new `idempotency_fingerprint` column.

## Quality checks

```sh
npm run lint
npm run build
npm run test:api
npm run test:e2e
npm run test:pwa
```

The Playwright suite starts a local Vite server and uses request interception for test fixtures. Install the browser once with:

```sh
npx playwright install chromium
```

For Linux environments with system Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` as documented in [`e2e/README.md`](e2e/README.md).

## API surface

- `GET /api/payment-methods` — currently enabled payment preferences.
- `POST /api/orders` — create an order request or perform an allowed order edit.
- `GET /api/menu-availability` — current sold-out/unavailable menu items.

API handlers validate requests on the server. Do not bypass server-side price, availability, delivery-zone, or order-state checks in the client.

## Deployment and security

- Deploy the Vite frontend and API routes in an environment compatible with the repository's server runtime.
- Apply database migrations deliberately and back up persistent data before production schema changes.
- Keep order tracking tokens private; a reference code alone must not grant access to order details.
- Treat payment confirmation as a staff-controlled workflow unless a verified payment-provider callback is configured.
- Do not use real customer data in automated tests or screenshots.

## Repository guides

- [Order editing setup](ORDER_EDITING_SETUP.md)
- [Sentry setup](SENTRY_SETUP.md)
- [Lighthouse report](LIGHTHOUSE_REPORT.md)
- [End-to-end test guide](e2e/README.md)
- [Project plan](plan.md)
