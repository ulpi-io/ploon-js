/**
 * JSON Parser - Native JSON.parse() with error handling
 */

import type { JsonValue } from '../types'

/**
 * Parse JSON string to JavaScript object
 * Uses native JSON.parse() - zero dependencies
 */
export function fromJSON(input: string): JsonValue {
  try {
    return JSON.parse(input) as JsonValue
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Invalid JSON: ${message}`)
  }
}

/**
 * Check if a string is valid JSON
 */
export function isJSON(input: string): boolean {
  try {
    JSON.parse(input)
    return true
  } catch {
    return false
  }
}

/**
 * Convert JavaScript object to JSON string
 * Convenience wrapper around JSON.stringify
 */
export function toJSON(value: JsonValue, pretty = false): string {
  return JSON.stringify(value, null, pretty ? 2 : 0)
}
