export interface AlgCase {
  /** Canonical id, e.g. 'OLL 27' or 'T Perm' */
  id: string
  /** Friendly name, e.g. 'Sune' */
  name: string
  /** Visual/category group used for section headers */
  group: string
  /** Space-separated moves in cubejs notation (URFDLB, wide, M/E/S, x/y/z) */
  alg: string
}
