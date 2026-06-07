import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { FaceKey } from '../facelets/facelets'
import { FACE_COLORS } from '../facelets/facelets'
import { STICKERS } from './geometry'

const UNPAINTED = '#3f3f46'

interface Props {
  grid: (FaceKey | null)[]
  onPaint: (index: number) => void
}

/**
 * Returns the Euler rotation [x, y, z] (in radians) that points the plane's
 * default +Z normal along the given axis-aligned outward normal.
 * Covers all 6 cube face normals.
 */
function orient(normal: [number, number, number]): [number, number, number] {
  const [x, y, z] = normal
  if (z === 1) return [0, 0, 0]
  if (z === -1) return [0, Math.PI, 0]
  if (x === 1) return [0, Math.PI / 2, 0]
  if (x === -1) return [0, -Math.PI / 2, 0]
  if (y === 1) return [-Math.PI / 2, 0, 0]
  if (y === -1) return [Math.PI / 2, 0, 0]
  return [0, 0, 0]
}

export function Cube3D({ grid, onPaint }: Props) {
  return (
    <div className="w-full aspect-square max-w-md mx-auto">
      <Canvas camera={{ position: [4, 4, 5], fov: 40 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 8, 6]} intensity={0.7} />
        {/* black cube body */}
        <mesh>
          <boxGeometry args={[3, 3, 3]} />
          <meshStandardMaterial color="#18181b" />
        </mesh>
        {/* stickers: group positions+orients, inner mesh renders plane at local origin */}
        {STICKERS.map((s) => {
          const color = grid[s.index]
          return (
            <group key={s.index} position={s.position} rotation={orient(s.normal)}>
              <mesh
                onClick={(e) => { e.stopPropagation(); onPaint(s.index) }}
                onPointerOver={(e) => e.stopPropagation()}
              >
                <planeGeometry args={[0.86, 0.86]} />
                <meshStandardMaterial
                  color={color ? FACE_COLORS[color] : UNPAINTED}
                  polygonOffset
                  polygonOffsetFactor={-1}
                />
              </mesh>
            </group>
          )
        })}
        <OrbitControls enablePan={false} minDistance={5} maxDistance={12} />
      </Canvas>
    </div>
  )
}
