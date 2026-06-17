import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Battle, Journey } from '../data/schema'
import { battleUnitTracks } from '../lib/battleUnitTracks'
import { UnitCounter } from './UnitCounter'
import { counterLayout } from './counterLayout'

/**
 * Persistent NATO APP-6 unit counters for a battle. Each authored unit gets one
 * billboarded counter that follows its interpolated position through playback.
 * Counters sit on the deterministic ellipsoid surface (no per-frame terrain
 * raycast), so this component does not depend on terrain-height refreshes —
 * avoiding re-renders that would flash the counters while tiles stream.
 */
export function BattleUnits({ battle, journey }: { battle: Battle; journey: Journey }) {
  const tracks = useMemo(() => battleUnitTracks(battle), [battle])

  // Resolve counter collisions once per frame (after counters report positions).
  useFrame(() => counterLayout.resolve())
  useEffect(() => () => counterLayout.clear(), [])

  return (
    <group>
      {tracks.map((track) => (
        <UnitCounter key={track.unit} track={track} battle={battle} journey={journey} />
      ))}
    </group>
  )
}
