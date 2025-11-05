/**
 * PLOON Scanner
 * Splits PLOON string into schema and records
 */

import type { PloonConfig } from '../types'
import { splitEscaped } from '../shared/string-utils'

export interface ScannedRecord {
  path: string
  values: string[]
}

export interface ScanResult {
  schema: string
  records: ScannedRecord[]
}

/**
 * Scan PLOON string and extract schema + records
 */
export function scan(ploonString: string, config: PloonConfig): ScanResult {
  const { recordSeparator, fieldDelimiter, escapeChar } = config

  // Split by record separator
  const parts = splitEscaped(ploonString, recordSeparator, escapeChar)

  if (parts.length < 1) {
    throw new Error('Invalid PLOON: No schema found')
  }

  // First part is schema (may have empty line after it)
  let schemaIndex = 0
  let schema = parts[0]!.trim()

  // Skip empty lines after schema
  while (schemaIndex + 1 < parts.length && parts[schemaIndex + 1]!.trim() === '') {
    schemaIndex++
  }

  // Remaining parts are records
  const recordParts = parts.slice(schemaIndex + 1)
  const records: ScannedRecord[] = []

  for (const part of recordParts) {
    const trimmed = part.trim()
    if (trimmed === '') {
      continue // Skip empty lines
    }

    // Split by field delimiter
    const fields = splitEscaped(trimmed, fieldDelimiter, escapeChar)

    if (fields.length < 1) {
      // Need at least path
      continue
    }

    const [path, ...values] = fields

    // Allow records with just path (for objects with no primitive fields)
    records.push({
      path: path!,
      values
    })
  }

  return { schema, records }
}
