import { expect, test } from '@playwright/test'
import { sanitizeSentryEvent } from '../src/monitoring/sentry.js'

const trackingToken = 'private-order-token-should-never-leave-the-browser'
const customerPhone = '+251900000000'

test('scrubs request, customer, and tracking-token data from Sentry events', () => {
  const event = sanitizeSentryEvent({
    message: `Failed while loading ${trackingToken}`,
    request: {
      url: `https://www.cloudlrestaurant.com/#track/${trackingToken}`,
      headers: { authorization: 'private-header' },
      data: { phone: customerPhone },
    },
    user: { id: 'customer-123', username: 'customer@example.test' },
    contexts: { order: { token: trackingToken } },
    extra: { phone: customerPhone },
    tags: { orderToken: trackingToken },
    breadcrumbs: [{ message: `Opened ${trackingToken}` }],
    transaction: `/tracking/${trackingToken}`,
    exception: {
      values: [
        {
          type: 'TypeError',
          value: `Could not load ${customerPhone} for ${trackingToken}`,
          stacktrace: {
            frames: [
              {
                filename: `https://www.cloudlrestaurant.com/assets/app.js?token=${trackingToken}#private`,
                abs_path: `https://www.cloudlrestaurant.com/assets/app.js?token=${trackingToken}`,
                vars: { phone: customerPhone, token: trackingToken },
                pre_context: [`${customerPhone} ${trackingToken}`],
                lineno: 42,
              },
            ],
          },
        },
      ],
    },
  })

  expect(event.message).toBe('Client-side exception')
  expect(event.request).toBeUndefined()
  expect(event.user).toBeUndefined()
  expect(event.contexts).toBeUndefined()
  expect(event.extra).toBeUndefined()
  expect(event.tags).toBeUndefined()
  expect(event.breadcrumbs).toBeUndefined()
  expect(event.transaction).toBeUndefined()
  expect(event.exception.values[0].value).toBe('TypeError')
  expect(event.exception.values[0].stacktrace.frames[0].filename).toBe('app.js')
  expect(event.exception.values[0].stacktrace.frames[0].abs_path).toBeUndefined()
  expect(event.exception.values[0].stacktrace.frames[0].vars).toBeUndefined()
  expect(event.exception.values[0].stacktrace.frames[0].pre_context).toBeUndefined()
  expect(JSON.stringify(event)).not.toContain(trackingToken)
  expect(JSON.stringify(event)).not.toContain(customerPhone)
})

test('does not send Sentry requests when no DSN is configured', async ({ page }) => {
  const sentryRequests: string[] = []
  page.on('request', (request) => {
    if (/sentry\.io/i.test(request.url())) sentryRequests.push(request.url())
  })
  await page.route('**/api/menu-availability', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ soldOutItemIds: [] }),
    }),
  )

  await page.goto('/')
  await expect(page.locator('h1').first()).toBeVisible()
  expect(sentryRequests).toEqual([])
})
