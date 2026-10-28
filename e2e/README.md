# Favorites end-to-end tests

Run the browser suite with:

```sh
npm ci
npx playwright install chromium
npm run test:e2e
```

On Linux with a system Chromium already installed, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable path, for example:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

Playwright starts a local Vite server on `127.0.0.1:4173`. The suite intercepts the menu-availability request with an empty sold-out list; it does not call Neon, create orders, or use production services. Test results and failure traces are ignored by Git.

Visual snapshots use Playwright's pinned Chromium build. To intentionally regenerate baselines after reviewing a design change, run `npm run test:e2e -- --update-snapshots`, then rerun `npm run test:e2e` without the update flag. GitHub Actions runs the same suite on pull requests targeting `main`.
