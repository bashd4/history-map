import { GlobeScene } from './scene/GlobeScene'
import { useAppStore } from './state/store'

if (import.meta.env.DEV) {
  ;(window as any).appStore = useAppStore
}

function App() {
  return <GlobeScene />
}

export default App
