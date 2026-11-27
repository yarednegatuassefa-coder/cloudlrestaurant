# WebMCP adoption — Cloud L Restaurant

## Scope
Reservation request and checkout forms are annotated for agent-assisted field population. No `toolautosubmit` is used. The customer must review and submit the reservation request or order.

## Transaction boundary
A reservation request is not a confirmed booking. Checkout, payment selection, final order placement, delivery address, and customer communications require explicit user review and submission. Do not expose staff/admin payment or order-management tools through these customer forms.

## Test
Confirm menu/cart behavior, form validation, request confirmation, checkout idempotency, and the ordinary human flow. Test agent field population only in an experimental supported Chromium environment.
