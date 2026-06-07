import Cube from 'virtual:cubejs-solver'

// Single accessor so the rest of the app imports the (augmented) solver Cube
// from one place; keeps the virtual-module import isolated and mockable.
export function getSolverCube(): typeof Cube {
  return Cube
}
