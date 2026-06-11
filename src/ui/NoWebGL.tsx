interface NoWebGLProps {
  reason?: 'unsupported' | 'lost'
}

export function NoWebGL({ reason = 'unsupported' }: NoWebGLProps) {
  const message =
    reason === 'lost'
      ? 'The graphics context was lost. Please reload the page.'
      : "This experience needs WebGL 2, which your browser doesn't support."

  return (
    <div className="no-webgl">
      <h1>Paths of History</h1>
      <p>{message}</p>
    </div>
  )
}
