/**
 * terrainRegistry — module-level singleton that bridges the TilesRenderer
 * instance (available only inside TilesRendererContext) to consumers mounted
 * outside that context (BattleUnits, BattleAnnotations).
 *
 * TerrainLayer calls setActiveTiles on mount/unmount.
 * TerrainHeightSampler calls getActiveTiles to raycast against tile meshes.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TilesInstance = any

let activeTiles: TilesInstance | null = null

export function setActiveTiles(tiles: TilesInstance | null): void {
  activeTiles = tiles
}

export function getActiveTiles(): TilesInstance | null {
  return activeTiles
}
