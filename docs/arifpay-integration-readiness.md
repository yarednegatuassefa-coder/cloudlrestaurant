# ArifPay integration readiness

## Current status

ArifPay is **not connected and is not an available payment method**. Merchant KYC/onboarding and API access are still pending. The current payment-method endpoint and order flow remain unchanged; customers can choose only the methods Cloud L currently enables, such as cash or manual transfer.

The new homepage teaser and checkout panel are informational only. They do not add an ArifPay radio option, call ArifPay, accept payment, or change order/payment status. The small first-party square image at `public/assets/partners/arifpay-mark.jpg` is an icon, not a complete wordmark; the interface pairs it with text and uses it only at small sizes.

## What must be confirmed before integration

The site owner reports the KYC packet is still pending: renewed business license, commercial registration, TIN/VAT certificate, manager’s national ID, and Memorandum of Association if the business is registered as a PLC. Wait for Cloud L’s merchant approval and the merchant-specific API credentials. Obtain the current official API/SDK instructions for the account, supported channels, sandbox and production configuration, checkout creation, return handling, transaction verification, webhook signature/authentication, cancellation/refund behavior, and any idempotency requirements. Confirm whether bank and Telebirr channels are enabled for this merchant rather than inferring that from a generic product description.

The official developer portal describes merchant dashboard access and sandbox tools. The official TypeScript SDK describes server-side use of an API key and checkout-session operations, but its public README identifies a 2022 release; verify the current supported SDK/API version with ArifPay before adding it as a dependency. References: [ArifPay developer portal](https://developer.arifpay.net/), [ArifPay TypeScript SDK](https://github.com/Arifpay-net/typescript-sdk), and [official square icon](https://arifpay.net/Arif.jpg).

## Safe implementation boundary

When access is granted, keep credentials and all provider calls in server-side API code. Create a provider adapter behind Cloud L’s order/payment boundary and calculate the payable amount from the persisted order on the server. Do not trust an amount or a success flag supplied by the browser. A browser return should only resume the user experience; mark an order paid only after the provider transaction is verified server-to-server or through an authenticated, signature-verified webhook, following ArifPay’s actual instructions.

Use the sandbox first. Add the provider’s real configuration names only after inspecting the issued contract; do not put secrets in Vite-prefixed/client-visible variables. Add explicit pending/verified/failed payment states and reconciliation/audit handling only after agreeing how they fit Cloud L’s existing order model. Then expose ArifPay as selectable only when the merchant is active, server configuration is complete, and the full verification path is in place. Keep cash and manual-transfer behavior intact during that work.

## Brand asset

Source: [ArifPay official icon](https://arifpay.net/Arif.jpg), downloaded as a 150×150 JPEG on 2026-11-14. It is suitable only for small icon usage; request an approved high-resolution wordmark before using it as a large brand lockup.
