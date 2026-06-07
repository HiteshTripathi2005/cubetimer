import { describe, it, expect } from 'vitest'
import { getSolverCube } from './solverCube'

describe('virtual:cubejs-solver', () => {
  it('exposes a Cube with initSolver and solve that augment cube.js', () => {
    const Cube = getSolverCube()
    expect(typeof Cube.initSolver).toBe('function')
    expect(typeof Cube.prototype.solve).toBe('function')
    expect(typeof Cube.fromString).toBe('function')
  })
})
