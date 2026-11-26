# Design-engineering review — Emil Kowalski skills

## Scope
Source-level review of the customer-facing restaurant site and ordering UI styles, using `emil-design-eng`, `mobile-native`, `review-animations`, and `animation-performance` principles.

## Applied
- Removed sticky hover transforms/filter changes on touch/coarse-pointer devices while retaining desktop hover affordances.
- Added subtle press feedback to ordering and navigation controls.
- Positioned the fixed cart trigger against the device safe-area inset.
- Set mobile form controls to 16px to avoid iOS focus zoom.
- Preserved the existing brand art direction and reduced-motion rules.

## Guardrails
No change to order creation, payment state, pricing, payment verification, reservations or customer data flows. Visual feedback must never imply an order/payment state the server has not confirmed.

## Not verified
No browser build, checkout regression suite, screenshot comparison, iOS/Android hardware test, frame recording or accessibility audit was run here. Verify the cart against bottom safe areas, keyboard-open states and real phones before merge.
