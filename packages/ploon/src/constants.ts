/**
 * PLOON Constants and Default Configurations
 */

import type { PloonConfig } from './types'

/**
 * Standard PLOON configuration (human-readable, newline-separated)
 */
export const PLOON_STANDARD: PloonConfig = {
  fieldDelimiter: '|',
  pathSeparator: ':',
  arraySizeMarker: '#',
  recordSeparator: '\n',
  escapeChar: '\\',
  schemaOpen: '[',
  schemaClose: ']',
  fieldsOpen: '(',
  fieldsClose: ')',
  nestedSeparator: '|'
}

/**
 * Compact PLOON configuration (token-optimized, semicolon-separated)
 */
export const PLOON_COMPACT: PloonConfig = {
  ...PLOON_STANDARD,
  recordSeparator: ';'
}

/**
 * Default configuration (uses standard format)
 */
export const DEFAULT_CONFIG: PloonConfig = PLOON_STANDARD

/**
 * Default stringify options
 */
export const DEFAULT_STRINGIFY_OPTIONS: { format: 'standard'; config: PloonConfig } = {
  format: 'standard' as const,
  config: DEFAULT_CONFIG
}

/**
 * Default parse options
 */
export const DEFAULT_PARSE_OPTIONS: { strict: boolean; config: PloonConfig } = {
  strict: true,
  config: DEFAULT_CONFIG
}
