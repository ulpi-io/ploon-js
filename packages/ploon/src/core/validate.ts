/**
 * PLOON Validation
 * Validate PLOON format and schema
 */

import type { ValidationResult, PloonConfig } from '../types'
import { DEFAULT_CONFIG } from '../constants'
import { scan } from '../decode/scanner'
import { parseSchema } from '../decode/parser'

/**
 * Check if a string is valid PLOON
 */
export function isValid(ploonString: string, config: PloonConfig = DEFAULT_CONFIG): boolean {
  try {
    const result = validate(ploonString, config)
    return result.valid
  } catch {
    return false
  }
}

/**
 * Validate PLOON string and return detailed result
 */
export function validate(
  ploonString: string,
  config: PloonConfig = DEFAULT_CONFIG
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // Try to scan
    const { schema, records } = scan(ploonString, config)

    if (!schema) {
      errors.push('No schema found')
    }

    if (records.length === 0) {
      warnings.push('No records found')
    }

    // Try to parse schema
    try {
      parseSchema(schema, config)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`Schema parsing failed: ${message}`)
    }

    // Check for path consistency
    const paths = records.map(r => r.path)
    const uniquePaths = new Set(paths)
    if (paths.length !== uniquePaths.size) {
      warnings.push('Duplicate paths found')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push(message)
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}
