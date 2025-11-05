/**
 * PLOON Stringify - Public API
 * Converts JavaScript object to PLOON string
 */

import type { JsonValue, StringifyOptions } from '../types'
import { normalizeValue } from '../encode/normalize'
import { encode } from '../encode/encoder'
import { resolveStringifyOptions } from '../config'

/**
 * Convert JavaScript object to PLOON string
 *
 * @param input - JavaScript object, array, or primitive
 * @param options - Stringify options (format, config)
 * @returns PLOON formatted string
 *
 * @example
 * ```typescript
 * const data = { products: [{ id: 1, name: "Shirt" }] }
 * const ploon = stringify(data)
 * // [products#1](id,name)
 * //
 * // 1|1|Shirt
 * ```
 */
export function stringify(input: unknown, options?: StringifyOptions): string {
  // Resolve options
  const resolved = resolveStringifyOptions(options)

  // Normalize input
  const normalized = normalizeValue(input) as JsonValue

  // Encode to PLOON
  const ploon = encode(normalized, resolved.config)

  return ploon
}
