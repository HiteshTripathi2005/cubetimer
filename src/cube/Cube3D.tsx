import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import type { Group } from 'three'
import type { FaceKey } from '../facelets/facelets'
import { FACE_COLORS } from '../facelets/facelets'
import { CUBIES, type Cubie } from './cubies'
import { parseMove } from './moves'

const UNPAINTED = '#3f3f46'
const BODY = '#0a0a0a'
const STICKER_OFFSET = 0.49 // just outside the 0.96 cubie face

// Euler rotation so a +Z-facing plane points along the given outward normal.
function orient(normal: [number, number, number]): [number, number, number] {
  const [x, y, z] = normal
  if (z === 1) return [0, 0, 0]
  if (z === -1) return [0, Math.PI, 0]
  if (x === 1) return [0, Math.PI / 2, 0]
  if (x === -1) return [0, -Math.PI / 2, 0]
  if (y === 1) return [-Math.PI / 2, 0, 0]
  return [Math.PI / 2, 0, 0] // y === -1
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

interface CubieProps {
  cubie: Cubie
  grid: (FaceKey | null)[]
  onPaint?: (index: number) => void
}

function CubieMesh({ cubie, grid, onPaint }: CubieProps) {
  return (
    <group position={cubie.position}>
      <mesh>
        <boxGeometry args={[0.96, 0.96, 0.96]} />
        <meshStandardMaterial color={BODY} />
      </mesh>
      {cubie.stickers.map((s) => {
        const color = grid[s.index]
        const [nx, ny, nz] = s.normal
        return (
          <group
            key={s.index}
            position={[nx * STICKER_OFFSET, ny * STICKER_OFFSET, nz * STICKER_OFFSET]}
            rotation={orient(s.normal)}
          >
            <mesh onClick={onPaint ? (e) => { e.stopPropagation(); onPaint(s.index) } : undefined}>
              <planeGeometry args={[0.84, 0.84]} />
              <meshStandardMaterial color={color ? FACE_COLORS[color] : UNPAINTED} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

interface SceneProps {
  grid: (FaceKey | null)[]
  onPaint?: (index: number) => void
  animateMove: string | null
  speedMs: number
  onMoveAnimated?: () => void
}

function Scene({ grid, onPaint, animateMove, speedMs, onMoveAnimated }: SceneProps) {
  const pivot = useRef<Group>(null)
  const start = useRef<number | null>(null)
  const done = useRef(false)
  const move = animateMove ? parseMove(animateMove) : null

  // Restart the animation whenever the requested move changes.
  useEffect(() => {
    start.current = null
    done.current = false
    if (pivot.current) pivot.current.rotation.set(0, 0, 0)
  }, [animateMove])

  useFrame((state) => {
    if (!move || !pivot.current || done.current) return
    if (start.current === null) start.current = state.clock.elapsedTime
    const dur = Math.max(0.001, (prefersReducedMotion() ? 1 : speedMs) / 1000)
    const t = Math.min(1, (state.clock.elapsedTime - start.current) / dur)
    pivot.current.rotation[move.axis] = move.angle * easeInOut(t)
    if (t >= 1) {
      done.current = true
      onMoveAnimated?.()
    }
  })

  const inLayer = (c: Cubie): boolean => {
    if (!move) return false
    const i = move.axis === 'x' ? 0 : move.axis === 'y' ? 1 : 2
    return move.slices.includes(c.position[i])
  }

  return (
    <>
      {CUBIES.filter((c) => !inLayer(c)).map((c) => (
        <CubieMesh key={c.position.join(',')} cubie={c} grid={grid} onPaint={onPaint} />
      ))}
      <group ref={pivot}>
        {CUBIES.filter(inLayer).map((c) => (
          <CubieMesh key={c.position.join(',')} cubie={c} grid={grid} onPaint={onPaint} />
        ))}
      </group>
    </>
  )
}

interface Props {
  grid: (FaceKey | null)[]
  onPaint?: (index: number) => void
  animateMove?: string | null
  speedMs?: number
  onMoveAnimated?: () => void
}

export function Cube3D({ grid, onPaint, animateMove = null, speedMs = 600, onMoveAnimated }: Props) {
  return (
    <div className="w-full aspect-square max-w-md md:max-w-lg xl:max-w-xl mx-auto">
      <Canvas camera={{ position: [4, 4, 5], fov: 40 }}>
        <ambientLight intensity={0.85} />
        <directionalLight position={[5, 8, 6]} intensity={0.7} />
        <Scene
          grid={grid}
          onPaint={onPaint}
          animateMove={animateMove}
          speedMs={speedMs}
          onMoveAnimated={onMoveAnimated}
        />
        <OrbitControls enablePan={false} minDistance={5} maxDistance={12} />
      </Canvas>
    </div>
  )
}
