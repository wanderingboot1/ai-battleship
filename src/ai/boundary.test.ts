import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

/**
 * The AI must decide using only an AIView. Its modules may import types and pure
 * board helpers from the engine, but never the full game state or the code that
 * builds the view from it.
 */
const ALLOWED_ENGINE_IMPORTS = new Set([
  '../engine/aiView', // type-only: the view itself
  '../engine/board',
  '../engine/placement',
  '../engine/types',
  '../engine/rng',
])

it('AI source files only import what is legally available to the AI', () => {
  const dir = join(import.meta.dirname, '.')
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  expect(files.length).toBeGreaterThan(0)
  for (const file of files) {
    const source = readFileSync(join(dir, file), 'utf8')
    for (const match of source.matchAll(/from\s+'([^']+)'/g)) {
      const spec = match[1]
      if (spec.startsWith('./')) continue
      expect(ALLOWED_ENGINE_IMPORTS.has(spec), `${file} imports ${spec}`).toBe(true)
    }
    for (const match of source.matchAll(/import\s+(?!type)[^'"]*from\s+'\.\.\/engine\/aiView'/g)) {
      throw new Error(`${file} must import AIView as a type only: ${match[0]}`)
    }
  }
})
