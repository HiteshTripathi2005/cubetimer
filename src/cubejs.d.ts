// We import the cube-only submodule (cubejs/lib/cube) rather than the package
// root, to avoid lib/solve.js (the unused two-phase solver) whose top-level
// `this.Cube` read throws under the browser's ESM module scope.
declare module 'cubejs/lib/cube' {
  export default class Cube {
    constructor()
    move(algorithm: string): this
    asString(): string
  }
}
