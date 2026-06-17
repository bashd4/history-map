import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Battle, Journey, LatLng } from '../data/schema'
import { battleUnitTracks } from '../lib/battleUnitTracks'
import { UnitCounter } from './UnitCounter'
import { useTerrainHeightsVersion } from './useTerrainHeights'
import { terrainSampler } from './useTerrainHeights'
import { counterLayout } from './counterLayout'

/**
 * Persistent NATO APP-6 unit counters for a battle.
 * Each authored unit gets one counter that drapes onto the terrain and follows
 * its interpolated position through battle playback.
 */
export function BattleUnits({ battle, journey }: { battle: Battle; journey: Journey }) {
  // Rebuild draped positions when streamed tiles refine the terrain heights.
  const heightsVersion = useTerrainHeightsVersion()

  const tracks = useMemo(() => battleUnitTracks(battle), [battle])

  // Pre-register every track position with the sampler so heights stay cached.
  // Re-registers whenever the battle changes or a tile refresh bumps
  // heightsVersion, keeping the sampler warm for these points.
  useEffect(() => {
    const points: LatLng[] = []
    for (const track of tracks) {
      for (const seg of track.segments) {
        if (seg.kind === 'rest') points.push(seg.at)
        else points.push(...seg.path)
      }
    }
    terrainSampler.registerPoints('units', points)
  }, [tracks, heightsVersion])

  // Resolve counter collisions once per frame (after the counters have reported
  // their positions in their own useFrame). Clear the layout on unmount.
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
