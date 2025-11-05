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

  // Unescape escape character itself (must be last)
  unescaped = unescaped.replace(new RegExp(`\\${escapeChar}\\${escapeChar}`, 'g'), escapeChar)

  // NOTE: We do NOT unescape path separator (.) because we never escape it in data values

  return unescaped
}

/**
 * Format a value for output (converts to string and escapes)
 */
export function formatValue(value: unknown, config: PloonConfig): string {
  if (value === null) {
    return 'null'
  }

  if (value === undefined) {
    return 'null'
  }

  const str = String(value)
  return escapeValue(str, config)
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Split a string by delimiter, respecting escapes
 */
export function splitEscaped(str: string, delimiter: string, escapeChar: string): string[] {
  const parts: string[] = []
  let current = ''
  let i = 0

  while (i < str.length) {
    if (str[i] === escapeChar && i + 1 < str.length) {
      // Escaped character - include the next character literally
      current += str[i + 1]
      i += 2
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
