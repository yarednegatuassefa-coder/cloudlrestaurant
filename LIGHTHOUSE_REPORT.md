# Cloud L Lighthouse performance report

**Date:** 6 November 2026

**Audit:** Lighthouse 12.8.2 with Chromium; one mobile-preset run and one desktop-preset run. Production was measured at `https://www.cloudlrestaurant.com/`. The optimized build was measured locally after `npm run build` with Vite Preview; it has not been deployed.

## Results

| Environment | Device profile | Performance | LCP | FCP | TBT | CLS |
|---|---|---:|---:|---:|---:|---:|
| Live production baseline | Mobile | 51 | 6.1 s | 4.0 s | 710 ms | 0.001 |
| Live production baseline | Desktop | 63 | 3.6 s | 3.5 s | 0 ms | 0 |
| Optimized local build | Mobile | 92 | 2.5 s | 2.0 s | 220 ms | 0.001 |
| Optimized local build | Desktop | 99 | 0.9 s | 0.4 s | 20 ms | 0.005 |

A controlled before/after comparison on the same local setup showed that adding measured `content-visibility` containment raised the mobile score from 61 to 92, reduced LCP from 5.0 s to 2.5 s, and reduced TBT from 710 ms to 220 ms. Desktop remained at 99 while LCP fell from 1.0 s to 0.9 s and TBT from 50 ms to 20 ms. CLS remained low; the local desktop result is 0.005.

The live and local rows are not a strict apples-to-apples production comparison: network paths, cache state, and hosting differ. Treat these as directional results. A post-deployment audit is still needed after the branch is reviewed and released.

## Changes on `feat/lighthouse-performance`

- Added 138 generated responsive WebP candidates—46 source images at 240, 480, and 960 pixels—for hero, food, drink, and featured imagery. Original images remain unchanged; total added weight is about 6.38 MiB before transfer, with the browser selecting an appropriately sized source.
- Preloaded the hero image at high priority and moved Google Fonts out of the CSS `@import` path into a non-blocking document-head load.
- Split staff, order-tracking, and checkout-form code into on-demand chunks.
- Applied `content-visibility: auto` to long below-the-fold sections, with viewport-specific intrinsic block sizes measured from the current layout to reduce initial rendering work while preserving scroll and anchor space.

## Validation and release status

- `npm run build`: passed.
- `npm run lint`: 0 errors; 15 existing warnings.
- `npm run test:e2e`: 5/5 passed (three functional tests and two visual-regression suites with six snapshots).
- No production code was deployed or changed by this performance branch. The live production figures above are the pre-change baseline.
