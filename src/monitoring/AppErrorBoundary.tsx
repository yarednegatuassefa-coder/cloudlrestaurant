import { Component, type ReactNode } from 'react'
import { captureClientException } from './sentry'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    captureClientException(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-fallback" role="alert" aria-live="assertive">
          <section className="app-error-fallback__panel">
            <p className="app-error-fallback__eyebrow">Cloud L</p>
            <h1>We’re sorry — this page hit a problem.</h1>
            <p>Please refresh the page to try again.</p>
            <p className="app-error-fallback__amharic" lang="am">
              ይቅርታ — ገጹ ችግር አጋጥሞታል። እባክዎ ገጹን እንደገና ይጫኑ።
            </p>
            <button type="button" onClick={() => window.location.reload()}>
              Refresh page <span lang="am">ገጹን እንደገና ጫን</span>
            </button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
