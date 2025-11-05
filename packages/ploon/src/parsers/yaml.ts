/**
 * YAML Parser - Uses yaml library (eemeli)
 */

import YAML from 'yaml'
import type { JsonValue } from '../types'

/**
 * Parse YAML string to JavaScript object
 */
export function fromYAML(input: string): JsonValue {
  try {
    return YAML.parse(input) as JsonValue
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    // Extract position info if available
    if (error && typeof error === 'object' && 'linePos' in error) {
      const linePos = (error as any).linePos
      throw new Error(`Invalid YAML at line ${linePos.line}, col ${linePos.col}: ${message}`)
    }

    throw new Error(`Invalid YAML: ${message}`)
  }
}

/**
 * Check if a string is valid YAML
 */
export function isYAML(input: string): boolean {
  try {
    YAML.parse(input)
    return true
  } catch {
    return false
  }
}

/**
 * Convert JavaScript object to YAML string
 */
export function toYAML(value: JsonValue, pretty = false): string {
  try {
    return YAML.stringify(value, {
      indent: pretty ? 2 : 0,
      lineWidth: 0, // Don't wrap long lines
      minContentWidth: 0
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`YAML serialization failed: ${message}`)
  }
}
