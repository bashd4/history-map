import { Route, Routes } from 'react-router-dom'
import { GlobeScene } from './scene/GlobeScene'
import { Hub } from './ui/Hub'
import { JourneyRoute } from './ui/JourneyStory'
import { useAppStore } from './state/store'

if (import.meta.env.DEV) {
  ;(window as any).appStore = useAppStore
}

export default function App() {
  return (
    <>
      <GlobeScene />
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/:journeyId" element={<JourneyRoute />} />
      </Routes>
    </>
  )
}
