import type { AlgCase } from './types'

// The 21 PLL cases with widely used standard algorithms (speedsolving wiki
// mains). Validated by tests: each alg must touch only last-layer stickers,
// leave the top face oriented, and every case pattern must be unique.
export const PLL_CASES: AlgCase[] = [
  { id: 'Ua Perm', name: 'Ua Perm', group: 'Edges only', alg: "R U' R U R U R U' R' U' R2" },
  { id: 'Ub Perm', name: 'Ub Perm', group: 'Edges only', alg: "R2 U R U R' U' R' U' R' U R'" },
  { id: 'H Perm', name: 'H Perm', group: 'Edges only', alg: 'M2 U M2 U2 M2 U M2' },
  { id: 'Z Perm', name: 'Z Perm', group: 'Edges only', alg: "M' U M2 U M2 U M' U2 M2" },
  { id: 'Aa Perm', name: 'Aa Perm', group: 'Corners only', alg: "x R' U R' D2 R U' R' D2 R2 x'" },
  { id: 'Ab Perm', name: 'Ab Perm', group: 'Corners only', alg: "x R2 D2 R U R' D2 R U' R x'" },
  { id: 'E Perm', name: 'E Perm', group: 'Corners only', alg: "x' R U' R' D R U R' D' R U R' D R U' R' D' x" },
  { id: 'T Perm', name: 'T Perm', group: 'Adjacent corner swap', alg: "R U R' U' R' F R2 U' R' U' R U R' F'" },
  { id: 'F Perm', name: 'F Perm', group: 'Adjacent corner swap', alg: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R" },
  { id: 'Ja Perm', name: 'Ja Perm', group: 'Adjacent corner swap', alg: "L' U' L F L' U' L U L F' L2 U L" },
  { id: 'Jb Perm', name: 'Jb Perm', group: 'Adjacent corner swap', alg: "R U R' F' R U R' U' R' F R2 U' R'" },
  { id: 'Ra Perm', name: 'Ra Perm', group: 'Adjacent corner swap', alg: "R U' R' U' R U R D R' U' R D' R' U2 R'" },
  { id: 'Rb Perm', name: 'Rb Perm', group: 'Adjacent corner swap', alg: "R2 F R U R U' R' F' R U2 R' U2 R" },
  { id: 'Ga Perm', name: 'Ga Perm', group: 'Adjacent corner swap', alg: "R2 U R' U R' U' R U' R2 U' D R' U R D'" },
  { id: 'Gb Perm', name: 'Gb Perm', group: 'Adjacent corner swap', alg: "R' U' R U D' R2 U R' U R U' R U' R2 D" },
  { id: 'Gc Perm', name: 'Gc Perm', group: 'Adjacent corner swap', alg: "R2 U' R U' R U R' U R2 U D' R U' R' D" },
  { id: 'Gd Perm', name: 'Gd Perm', group: 'Adjacent corner swap', alg: "R U R' U' D R2 U' R U' R' U R' U R2 D'" },
  { id: 'V Perm', name: 'V Perm', group: 'Diagonal corner swap', alg: "R' U R' U' R D' R' D R' U D' R2 U' R2 D R2" },
  { id: 'Y Perm', name: 'Y Perm', group: 'Diagonal corner swap', alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
  { id: 'Na Perm', name: 'Na Perm', group: 'Diagonal corner swap', alg: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'" },
  { id: 'Nb Perm', name: 'Nb Perm', group: 'Diagonal corner swap', alg: "R' U R U' R' F' U' F R U R' F R' F' R U' R" },
]
