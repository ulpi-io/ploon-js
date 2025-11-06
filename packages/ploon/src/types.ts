/**
 * PLOON Type Definitions
 */

// JSON-compatible types
export type JsonPrimitive = string | number | boolean | null
export type JsonArray = JsonValue[]
export type JsonObject = { [key: string]: JsonValue }
export type JsonValue = JsonPrimitive | JsonObject | JsonArray

/**
 * PLOON Configuration
 * Defines all configurable characters and delimiters
 */
export interface PloonConfig {
  /** Field delimiter (separates values in a record) */
  fieldDelimiter: string          // default: '|'

  /** Path separator (separates path segments) */
  pathSeparator: string           // default: '.'

  /** Array size marker (indicates array length in schema) */
  arraySizeMarker: string         // default: '#'

  /** Record separator (separates records) */
  recordSeparator: string         // default: '\n' (standard) or ';' (compact)

  /** Escape character (escapes special characters) */
  escapeChar: string              // default: '\\'

  /** Schema opening bracket */
  schemaOpen: string              // default: '['

  /** Schema closing bracket */
  schemaClose: string             // default: ']'

  /** Fields opening parenthesis */
  fieldsOpen: string              // default: '('

  /** Fields closing parenthesis */
  fieldsClose: string             // default: ')'

  /** Nested separator (separates nested schemas) */
  nestedSeparator: string         // default: '|'

  /** Schema field separator (separates field names in schema) */
  schemaFieldSeparator: string    // default: '|'

  /** Schema whitespace (optional whitespace character in schema) */
  schemaWhitespace: string        // default: ' '

  /** Optional field marker (suffix for fields not present in all array elements) */
  optionalFieldMarker: string     // default: '?'

  /** Preserve empty arrays/objects with presence markers (fieldname() or fieldname{}) */
  preserveEmptyFields: boolean    // default: true
}

/**
 * Options for stringify function
 */
export interface StringifyOptions {
  /** Output format */
  format?: 'standard' | 'compact'

  /** Custom configuration (overrides defaults) */
  config?: Partial<PloonConfig>
}

/**
 * Options for parse function
 */
export interface ParseOptions {
  /** Strict mode - validate schema consistency */
  strict?: boolean

  /** Custom configuration (overrides defaults) */
  config?: Partial<PloonConfig>
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether the input is valid */
  valid: boolean

  /** Error messages (if invalid) */
  errors?: string[]

  /** Warning messages */
  warnings?: string[]
}

/**
 * Internal types for encoding
 */

export type FieldType = 'primitive' | 'primitiveArray' | 'array' | 'object'

export interface SchemaField {
  name: string
  type: FieldType
  isOptional?: boolean    // Field is not present in all array elements
  nested?: JsonArray | JsonObject
  fields?: SchemaField[]  // For nested object fields
}

export interface SchemaNode {
  count?: number
  fields: SchemaField[]
}

export interface PathNode {
  path: string
  values: JsonValue[]
  children?: PathNode[]
}
