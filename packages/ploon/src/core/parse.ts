/**
 * PLOON Parse - Public API
 * Converts PLOON string to JavaScript object
 */

import type { JsonValue, ParseOptions } from '../types'
import { decode } from '../decode/decoder'
import { resolveParseOptions } from '../config'

/**
 * Parse PLOON string to JavaScript object
 *
 * @param ploonString - PLOON formatted string
 * @param options - Parse options (strict, config)
 * @returns JavaScript object
 *
 * @example
 * ```typescript
 * const ploon = `[products#1](id,name)
 *
 * 1|1|Shirt`
 * const data = parse(ploon)
 * // { products: [{ id: 1, name: "Shirt" }] }
 * ```
 */
export function parse(ploonString: string, options?: ParseOptions): JsonValue {
  // Resolve options
  const resolved = resolveParseOptions(options)

  // Decode PLOON
  const result = decode(ploonString, resolved.config)

  return result
}
