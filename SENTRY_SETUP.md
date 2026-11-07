# Sentry setup for Cloud L

The React Sentry SDK is optional and remains inactive until `VITE_SENTRY_DSN` is set at **build time**. When configured, the SDK is dynamically loaded after the browser becomes idle, only on `cloudlrestaurant.com` or `www.cloudlrestaurant.com`; local development and Vercel Preview do not initialize it. A caught React render error requests the SDK immediately. A React render error still shows a bilingual recovery screen when monitoring is not configured. The official React SDK guide describes the browser integration [1].

Sentry currently lists its Developer plan as Free for one user. Check the actual event allowance in the Sentry account before enabling it; no subscription or purchase was made for this work [2].

Create a Sentry React project for Cloud L, copy its **public project DSN**, and add it to Vercel as `VITE_SENTRY_DSN` for the Production environment only. Do not provide or configure a Sentry auth token. Since Vite injects this variable at build time, a new production build/deployment is required after it is configured. No source-map upload is included.

Before an event is sent, the client removes request details, user identity, contexts, extras, tags, breadcrumbs, transaction names, free-form error messages, frame variables, and URL query/fragment data. It keeps only the exception type and sanitized stack-frame filenames and line numbers. The installed v11 browser options do not expose `sendDefaultPii`; this integration does not request any PII feature and applies the explicit scrubber to every event. Tracing, replay, and user feedback are not enabled. No event is sent until both a DSN and the production custom-domain origin are present.

For local validation, keep the DSN blank and run `npm run test:e2e`; the tests verify sanitization and that no Sentry network request occurs without configuration. Do not use a real DSN for local tests.

## References

[1]: https://docs.sentry.io/platforms/javascript/guides/react/ "Sentry React SDK"
[2]: https://sentry.io/pricing/ "Sentry pricing"
