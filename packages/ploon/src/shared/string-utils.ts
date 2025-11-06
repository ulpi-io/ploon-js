/**
 * String Utilities
 * Escaping, quoting, and string manipulation
 */

import type { PloonConfig } from '../types'

/**
 * Escape special characters in a value
 */
export function escapeValue(value: string, config: PloonConfig): string {
  const { escapeChar, fieldDelimiter, recordSeparator, pathSeparator } = config

  let escaped = value

  // Escape the escape character itself first
  escaped = escaped.replace(new RegExp(`\\${escapeChar}`, 'g'), `${escapeChar}${escapeChar}`)

  // Escape field delimiter
  escaped = escaped.replace(new RegExp(`\\${fieldDelimiter}`, 'g'), `${escapeChar}${fieldDelimiter}`)

  // Escape record separator (handle multi-char separators)
  if (recordSeparator.length === 1) {
    escaped = escaped.replace(new RegExp(`\\${recordSeparator}`, 'g'), `${escapeChar}${recordSeparator}`)
  } else {
    escaped = escaped.replace(new RegExp(escapeRegex(recordSeparator), 'g'), `${escapeChar}${recordSeparator}`)
  }

  // Escape comma (used in primitive arrays)
  escaped = escaped.replace(/,/g, `${escapeChar},`)

  // NOTE: We do NOT escape path separator (.) in data values
  // The scanner splits by field delimiter (|) first, isolating the path from data
  // So periods in data values (29.99, emails, coordinates) don't conflict with path notation (1.1.1)

  return escaped
}

/**
 * Unescape special characters in a value
 */
export function unescapeValue(value: string, config: PloonConfig): string {
  const { escapeChar, fieldDelimiter, recordSeparator } = config

  let unescaped = value

  // Unescape delimiters
  unescaped = unescaped.replace(new RegExp(`\\${escapeChar}\\${fieldDelimiter}`, 'g'), fieldDelimiter)

  if (recordSeparator.length === 1) {
    unescaped = unescaped.replace(new RegExp(`\\${escapeChar}\\${recordSeparator}`, 'g'), recordSeparator)
  } else {
    unescaped = unescaped.replace(new RegExp(`\\${escapeChar}${escapeRegex(recordSeparator)}`, 'g'), recordSeparator)
  }

  // Unescape comma
  unescaped = unescaped.replace(new RegExp(`\\${escapeChar},`, 'g'), ',')

  // Unescape escape character itself (must be last)
  unescaped = unescaped.replace(new RegExp(`\\${escapeChar}\\${escapeChar}`, 'g'), escapeChar)

  // NOTE: We do NOT unescape path separator (.) because we never escape it in data values

  return unescaped
}

/**
 * Format a value for output (converts to string and escapes)
 */
export function formatValue(value: unknown, config: PloonConfig, isOptional?: boolean): string {
  if (value === null) {
    return 'null'
  }

  if (value === undefined) {
    // For optional fields, empty string means "field not present"
    // For required fields, undefined becomes 'null'
    return isOptional ? '' : 'null'
  }

  const str = String(value)
  return escapeValue(str, config)
}

/**
 * Format a primitive array for inline encoding (comma-separated)
 * Handles null values and respects preserveEmptyFields config
 */
export function formatPrimitiveArray(array: unknown[], config: PloonConfig, preserveEmpty: boolean): string {
  // Map each element: null → '', then format
  let elements = array.map(item => {
    if (item === null) {
      return '' // Convert null to empty string
    }
    if (item === undefined) {
      return ''
    }
    // Format the value (escapes commas, pipes, etc.)
    const str = String(item)
    return escapeValue(str, config)
  })

  // If not preserving empty fields, filter out empty strings
  if (!preserveEmpty) {
    elements = elements.filter(el => el !== '')
  }

  // Join with commas
  return elements.join(',')
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Split a string by delimiter, respecting escapes
 * Only unescapes the delimiter and escape char itself, preserves other escape sequences
 */
export function splitEscaped(str: string, delimiter: string, escapeChar: string): string[] {
  const parts: string[] = []
  let current = ''
  let i = 0

  while (i < str.length) {
    if (str[i] === escapeChar && i + 1 < str.length) {
      const nextChar = str[i + 1]!

      // Only unescape if it's the delimiter or escape char itself
      // Other escape sequences stay escaped for later processing
      if (nextChar === delimiter || nextChar === escapeChar) {
        // Unescape - include just the next character
        current += nextChar
        i += 2
      } else {
        // Keep the escape sequence intact
        current += str[i] + nextChar
        i += 2
      }
    } else if (str.slice(i, i + delimiter.length) === delimiter) {
      // Found delimiter
      parts.push(current)
      current = ''
      i += delimiter.length
    } else {
      current += str[i]
      i++
    }
  }

  parts.push(current)
  return parts
}
