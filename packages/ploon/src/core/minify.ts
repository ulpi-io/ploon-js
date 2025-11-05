/**
 * PLOON Minify
 * Convert Standard format (newline-separated) to Compact format (semicolon-separated)
 */

import { PLOON_STANDARD, PLOON_COMPACT } from '../constants'

/**
 * Minify PLOON string (Standard → Compact)
 * Replaces newlines with semicolons and removes unnecessary whitespace
 */
export function minify(ploonString: string): string {
  // Split into lines
  const lines = ploonString.split('\n')

  // Remove empty lines (especially the blank line after schema)
  const nonEmptyLines = lines.filter(line => line.trim().length > 0)

  // Join with semicolons
  const minified = nonEmptyLines.join(';')

  // Remove trailing semicolon if present
  return minified.endsWith(';') ? minified.slice(0, -1) : minified
}
