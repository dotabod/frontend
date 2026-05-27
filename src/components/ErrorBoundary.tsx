import * as Sentry from '@sentry/nextjs'
import { Button } from 'antd'
import { Component, type ErrorInfo, Fragment, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  resetKey: number
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      error: null,
      hasError: false,
      resetKey: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      error,
      hasError: true,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error, errorInfo)
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
      tags: { feature: 'error-boundary' },
    })
    this.props.onError?.(error, errorInfo)
  }

  reset = (): void => {
    // Bump resetKey so the subtree remounts; otherwise a deterministic crash
    // re-throws against the same stale state/props on the next render.
    this.setState((s) => ({ error: null, hasError: false, resetKey: s.resetKey + 1 }))
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className='rounded-lg border border-red-800 bg-red-950/40 p-5 text-sm text-red-200 shadow-lg'>
          <h3 className='font-medium text-red-200'>Something went wrong</h3>
          <p className='mt-2 text-red-200/80'>
            This section couldn't load. The rest of the page should still work.
          </p>
          <Button onClick={this.reset} size='small' className='mt-3'>
            Try again
          </Button>
        </div>
      )
    }

    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>
  }
}

export default ErrorBoundary
