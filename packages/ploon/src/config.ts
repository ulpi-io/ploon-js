/**
 * PLOON Configuration Management
 */

import type { PloonConfig, StringifyOptions, ParseOptions } from './types'
import { PLOON_STANDARD, PLOON_COMPACT, DEFAULT_CONFIG } from './constants'

/**
 * Merge user-provided config with defaults
 */
export function resolveConfig(config?: Partial<PloonConfig>): PloonConfig {
  if (!config) {
    return DEFAULT_CONFIG
  }

  return {
    ...DEFAULT_CONFIG,
    ...config
  }
}

/**
 * Resolve stringify options with defaults
 */
export function resolveStringifyOptions(options?: StringifyOptions): { format: 'standard' | 'compact'; config: PloonConfig } {
  const format = options?.format ?? 'standard'
  const baseConfig = format === 'compact' ? PLOON_COMPACT : PLOON_STANDARD
  const config = options?.config ? { ...baseConfig, ...options.config } : baseConfig

  return {
    format,
    config
  }
}

/**
 * Resolve parse options with defaults
 */
export function resolveParseOptions(options?: ParseOptions): { strict: boolean; config: PloonConfig } {
  return {
    strict: options?.strict ?? true,
    config: resolveConfig(options?.config)
  }
}

/**
 * Validate configuration
 * Ensures all config values are single characters (except recordSeparator)
 */
export function validateConfig(config: PloonConfig): void {
  const errors: string[] = []

  // Validate single character constraints
  const singleCharFields: (keyof PloonConfig)[] = [
    'fieldDelimiter',
    'pathSeparator',
    'arraySizeMarker',
    'escapeChar',
    'schemaOpen',
    'schemaClose',
    'fieldsOpen',
    'fieldsClose',
    'nestedSeparator',
    'schemaFieldSeparator',
    'schemaWhitespace',
    'optionalFieldMarker'
  ]

  for (const field of singleCharFields) {
    const value = config[field]
    if (value.length !== 1) {
      errors.push(`${field} must be exactly 1 character, got: "${value}"`)
    }
  }

  // Validate recordSeparator (can be multi-char but typically single)
  if (config.recordSeparator.length === 0) {
    errors.push('recordSeparator cannot be empty')
  }

  // Check for conflicts (same character used for different purposes)
  const chars = new Map<string, string[]>()
  const addChar = (char: string, field: string) => {
    if (!chars.has(char)) {
      chars.set(char, [])
    }
    chars.get(char)!.push(field)
  }

  addChar(config.fieldDelimiter, 'fieldDelimiter')
  addChar(config.pathSeparator, 'pathSeparator')
  addChar(config.arraySizeMarker, 'arraySizeMarker')
  addChar(config.escapeChar, 'escapeChar')
  addChar(config.schemaOpen, 'schemaOpen')
  addChar(config.schemaClose, 'schemaClose')
  addChar(config.fieldsOpen, 'fieldsOpen')
  addChar(config.fieldsClose, 'fieldsClose')
  addChar(config.nestedSeparator, 'nestedSeparator')
  addChar(config.schemaFieldSeparator, 'schemaFieldSeparator')
  addChar(config.schemaWhitespace, 'schemaWhitespace')
  addChar(config.optionalFieldMarker, 'optionalFieldMarker')

  for (const [char, fields] of chars.entries()) {
    if (fields.length > 1) {
      errors.push(`Character "${char}" is used for multiple purposes: ${fields.join(', ')}`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid PLOON configuration:\n${errors.join('\n')}`)
  }
}

/**
 * Detect format from PLOON string content
 * Returns 'standard' if uses newlines, 'compact' if uses semicolons
 */
export function detectFormat(ploonString: string): 'standard' | 'compact' {
  // Look for record separator after the schema
  const schemaEnd = ploonString.indexOf(')')
  if (schemaEnd === -1) {
    return 'standard' // Default
  }

  const afterSchema = ploonString.slice(schemaEnd + 1)

  // Check what comes after schema
  if (afterSchema.includes(';') && !afterSchema.includes('\n')) {
    return 'compact'
  }

  if (afterSchema.includes('\n')) {
    return 'standard'
  }

  return 'standard' // Default
}

/**
 * Auto-detect configuration from PLOON string
 * Attempts to detect delimiters used
 */
export function detectConfig(ploonString: string): Partial<PloonConfig> {
  const format = detectFormat(ploonString)
  const baseConfig = format === 'compact' ? PLOON_COMPACT : PLOON_STANDARD

  // For now, just return the base config
  // Could be enhanced to detect custom delimiters
  return baseConfig
}
