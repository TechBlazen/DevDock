import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Bumping this (e.g. the current route path) resets the boundary after navigation. */
  resetKey?: string
}

interface State {
  error: Error | null
}

/**
 * Catches render-time throws from the page tree so one broken component shows a
 * recoverable fallback instead of unmounting the whole SPA (blank white page).
 * Navigating to a new route (changed `resetKey`) clears the error automatically.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the details for debugging; OTel/console is the only sink here.
    console.error('Render error caught by ErrorBoundary:', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  handleReset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-3" style={{ color: 'var(--text-faint)' }}>⚠️</div>
          <div className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
            Something went wrong
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
            This page hit an unexpected error. Try again, or navigate elsewhere.
          </div>
          <pre
            className="text-[11px] mt-3 p-2 rounded text-left overflow-auto max-h-40"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-faint)' }}
          >
            {error.message}
          </pre>
          <button
            onClick={this.handleReset}
            className="mt-3 px-3 py-1.5 rounded text-xs font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Try again
          </button>
        </div>
      </div>
    )
  }
}
