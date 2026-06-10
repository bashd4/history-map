import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Error boundary for the lazily-loaded terrain layer. Lives in its own
 * non-lazy module so it also catches chunk-load failures of TerrainLayer
 * itself (a boundary inside the lazy module can't catch its own import
 * failing). Tile/terrain failure must never crash the app — the battle
 * plays over the plain globe instead.
 */
export class TerrainErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[terrain] failed, falling back to globe:', error, info)
  }

  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}
