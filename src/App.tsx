import { Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { GlobeScene } from './scene/GlobeScene'
import { Hub } from './ui/Hub'
import { JourneyRoute } from './ui/JourneyStory'
import { NoWebGL } from './ui/NoWebGL'
import { useAppStore } from './state/store'

if (import.meta.env.DEV) {
  ;(window as any).appStore = useAppStore
}

// One-time WebGL 2 availability check at module load (before any React rendering).
function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return canvas.getContext('webgl2') !== null
  } catch {
    return false
  }
}

const webgl2Available = hasWebGL2()

export default function App() {
  // 'lost' means a second unrecoverable context loss occurred.
  const [contextLost, setContextLost] = useState(false)
  const [tabVisible, setTabVisible] = useState(!document.hidden)

  // Tab visibility — drives frameloop pause in GlobeScene.
  useEffect(() => {
    const handleVisibility = () => setTabVisible(!document.hidden)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  if (!webgl2Available) return <NoWebGL reason="unsupported" />
  if (contextLost) return <NoWebGL reason="lost" />

  return (
    <>
      <GlobeScene tabVisible={tabVisible} onContextLost={() => setContextLost(true)} />
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/:journeyId" element={<JourneyRoute />} />
      </Routes>
    </>
  )
}
