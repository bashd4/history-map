import { useAppStore } from '../state/store'
import { niceScaleDistance } from '../lib/mapScale'

const MAX_BAR_PX = 160

/** Ground scale bar, shown in Map view only (a single bar is meaningless across
 *  an oblique Field-view frame). Reads metres-per-pixel from the store and snaps
 *  to a round distance; updates live as the user zooms. */
export function BattleScaleBar() {
  const view = useAppStore((s) => s.battleView)
  const mpp = useAppStore((s) => s.metersPerPixel)
  if (view !== 'map' || !(mpp > 0)) return null
  const { pixels, label } = niceScaleDistance(mpp, MAX_BAR_PX)
  return (
    <div className="battle-scalebar" aria-hidden="true">
      <span className="battle-scalebar-label">{label}</span>
      <div className="battle-scalebar-bar" style={{ width: `${pixels}px` }} />
    </div>
  )
}
