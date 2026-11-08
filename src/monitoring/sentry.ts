const productionHosts = new Set(['cloudlrestaurant.com', 'www.cloudlrestaurant.com'])

type UnknownRecord = Record<string, unknown>

/** Remove customer, order, URL, and free-form message data before an event leaves the browser. */
export function sanitizeSentryEvent<T extends object>(event: T): T {
  const record = event as UnknownRecord
  for (const key of [
    'request',
    'user',
    'contexts',
    'extra',
    'tags',
    'breadcrumbs',
    'transaction',
    'culprit',
    'server_name',
    'logentry',
  ]) {
    delete record[key]
  }

  if (typeof record.message === 'string') {
    record.message = 'Client-side exception'
  }

  const exception = record.exception
  if (typeof exception === 'object' && exception !== null) {
    const values = (exception as { values?: unknown }).values
    if (Array.isArray(values)) {
      for (const value of values) {
        if (typeof value !== 'object' || value === null) continue
        const exceptionValue = value as UnknownRecord
        exceptionValue.value =
          typeof exceptionValue.type === 'string' && exceptionValue.type.length > 0
            ? exceptionValue.type
            : 'Error'

        const stacktrace = exceptionValue.stacktrace
        if (typeof stacktrace !== 'object' || stacktrace === null) continue
        const frames = (stacktrace as { frames?: unknown }).frames
        if (!Array.isArray(frames)) continue

        for (const frame of frames) {
          if (typeof frame !== 'object' || frame === null) continue
          const frameRecord = frame as UnknownRecord
          delete frameRecord.abs_path
          delete frameRecord.vars
          delete frameRecord.pre_context
          delete frameRecord.post_context

          if (typeof frameRecord.filename === 'string') {
            const pathWithoutQueryOrFragment = frameRecord.filename.split(/[?#]/, 1)[0]
            frameRecord.filename = pathWithoutQueryOrFragment.split('/').pop() || 'app.js'
          }
        }
      }
    }
  }

  return event
}

let sentryClientPromise: Promise<typeof import('@sentry/react') | null> | undefined

function isMonitoringEnabled() {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()
  const hostname = typeof window === 'undefined' ? '' : window.location.hostname.toLowerCase()
  return Boolean(dsn) && import.meta.env.PROD && productionHosts.has(hostname)
}

async function loadSentryClient() {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()

  if (!dsn || !isMonitoringEnabled()) return null

  if (!sentryClientPromise) {
    sentryClientPromise = import('@sentry/react')
      .then((Sentry) => {
        Sentry.init({
          dsn,
          maxBreadcrumbs: 0,
          tracesSampleRate: 0,
          beforeSend: sanitizeSentryEvent,
        })
        return Sentry
      })
      .catch(() => null)
  }

  return sentryClientPromise
}

/** Load the SDK after the first render; a caught React error requests it immediately. */
export function initializeClientErrorTracking() {
  if (!isMonitoringEnabled() || typeof window === 'undefined') return

  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  }
  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(() => void loadSentryClient(), { timeout: 5000 })
  } else {
    window.setTimeout(() => void loadSentryClient(), 1500)
  }
}

/** Used by the app-level React boundary; the same scrubber runs before any event is sent. */
export function captureClientException(error: unknown) {
  void loadSentryClient().then((Sentry) => Sentry?.captureException(error))
}
