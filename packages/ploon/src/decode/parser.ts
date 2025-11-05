/**
 * PLOON Schema Parser
 * Parses PLOON schema to extract structure
 */

import type { PloonConfig } from '../types'

export interface ParsedSchema {
  rootName: string
  count: number
  fields: ParsedField[]
}

export interface ParsedField {
  name: string
  isArray: boolean
  isObject: boolean
  nested?: ParsedSchema
}

/**
 * Parse PLOON schema
 * Example: [products#2](id,name,price|colors#(name,hex))
 */
export function parseSchema(schema: string, config: PloonConfig): ParsedSchema {
  const {
    schemaOpen,
    schemaClose,
    fieldsOpen,
    fieldsClose,
    arraySizeMarker
  } = config

  // Extract root name and count: [products#2]
  const headerStart = schema.indexOf(schemaOpen)
  const headerEnd = schema.indexOf(schemaClose, headerStart)

  if (headerStart === -1 || headerEnd === -1) {
    throw new Error(`Invalid PLOON schema: ${schema}`)
  }

  const header = schema.slice(headerStart + 1, headerEnd)
  const [rootName, countStr] = header.split(arraySizeMarker)
  const count = countStr ? parseInt(countStr, 10) : 0

  // Extract fields with proper parentheses matching
  const fieldsStart = schema.indexOf(fieldsOpen, headerEnd)
  if (fieldsStart === -1) {
    throw new Error(`Invalid PLOON schema: No fields found`)
  }

  const fieldsEnd = findMatchingCloseParen(schema, fieldsStart, fieldsOpen, fieldsClose)
  if (fieldsEnd === -1) {
    throw new Error(`Invalid PLOON schema: Unmatched parentheses`)
  }

  const fieldsStr = schema.slice(fieldsStart + 1, fieldsEnd)
  const fields = parseFields(fieldsStr, config)

  return {
    rootName: rootName!,
    count,
    fields
  }
}

/**
 * Parse fields string with proper parentheses matching
 */
function parseFields(fieldsStr: string, config: PloonConfig): ParsedField[] {
  const fields: ParsedField[] = []
  let pos = 0

  while (pos < fieldsStr.length) {
    // Skip whitespace
    while (pos < fieldsStr.length && fieldsStr[pos] === ' ') pos++
    if (pos >= fieldsStr.length) break

    // Parse next field
    const { field, nextPos } = parseNextField(fieldsStr, pos, config)
    fields.push(field)
    pos = nextPos

    // Skip comma separator
    while (pos < fieldsStr.length && (fieldsStr[pos] === ',' || fieldsStr[pos] === ' ')) pos++
  }

  return fields
}

/**
 * Parse a single field definition
 * Handles nested arrays like "colors#(name,hex)" and objects like "customer{id,name}"
 */
function parseNextField(
  str: string,
  start: number,
  config: PloonConfig
): { field: ParsedField; nextPos: number } {
  const { arraySizeMarker, fieldsOpen, fieldsClose } = config

  let depth = 0
  let braceDepth = 0
  let pos = start

  // Scan until comma at depth 0 or end of string
  while (pos < str.length) {
    if (str[pos] === fieldsOpen) {
      depth++
    } else if (str[pos] === fieldsClose) {
      depth--
    } else if (str[pos] === '{') {
      braceDepth++
    } else if (str[pos] === '}') {
      braceDepth--
    } else if (str[pos] === ',' && depth === 0 && braceDepth === 0) {
      break
    }
    pos++
  }

  const fieldStr = str.slice(start, pos).trim()
  const field = parseFieldDefinition(fieldStr, config)

  return { field, nextPos: pos }
}

/**
 * Parse field definition string
 * Returns ParsedField with nested schema if array or object
 * Examples:
 *   - Array: "colors#(name,hex)"
 *   - Object: "customer{id,name,address{street,city}}"
 */
function parseFieldDefinition(fieldStr: string, config: PloonConfig): ParsedField {
  const { arraySizeMarker, fieldsOpen, fieldsClose } = config

  // Find both array marker and object brace positions
  const arrayMarkerIndex = fieldStr.indexOf(arraySizeMarker + fieldsOpen)
  const objectBraceIndex = fieldStr.indexOf('{')

  // Check which comes first (or if only one exists)
  // This handles cases like:
  // - "colors#(name,hex)" - array notation only
  // - "customer{id,name}" - object notation only
  // - "departments#(manager{id,name},name)" - array notation comes first (has nested object)
  // - "profile{hobbies#(name,hours)}" - object notation comes first (has nested array)

  let hasArray = arrayMarkerIndex !== -1
  let hasObject = objectBraceIndex !== -1

  // If both exist, check which comes first
  if (hasArray && hasObject) {
    if (arrayMarkerIndex < objectBraceIndex) {
      // Array notation comes first - it's an array field
      hasObject = false
    } else {
      // Object notation comes first - it's an object field
      hasArray = false
    }
  }

  if (hasObject) {
    // Nested object field: "customer{id,name,address{street,city}}"
    const name = fieldStr.slice(0, objectBraceIndex).trim()

    // Find matching closing brace
    const closePos = findMatchingCloseBrace(fieldStr, objectBraceIndex)

    if (closePos === -1) {
      throw new Error(`Unmatched braces in field: ${fieldStr}`)
    }

    // Extract nested fields string
    const nestedFieldsStr = fieldStr.slice(objectBraceIndex + 1, closePos)

    // Recursively parse nested fields
    const nestedFields = parseFields(nestedFieldsStr, config)

    return {
      name,
      isArray: false,
      isObject: true,
      nested: {
        rootName: name,
        count: 0,
        fields: nestedFields
      }
    }
  }

  if (hasArray) {
    // Nested array field: "colors#(name,hex)"
    const name = fieldStr.slice(0, arrayMarkerIndex).trim()

    // Find matching closing paren
    const openPos = arrayMarkerIndex + arraySizeMarker.length
    const closePos = findMatchingCloseParen(fieldStr, openPos, fieldsOpen, fieldsClose)

    if (closePos === -1) {
      throw new Error(`Unmatched parentheses in field: ${fieldStr}`)
    }

    // Extract nested fields string
    const nestedFieldsStr = fieldStr.slice(openPos + 1, closePos)

    // Recursively parse nested fields
    const nestedFields = parseFields(nestedFieldsStr, config)

    return {
      name,
      isArray: true,
      isObject: false,
      nested: {
        rootName: name,
        count: 0, // Count not specified in nested schemas
        fields: nestedFields
      }
    }
  }

  // Simple field
  return {
    name: fieldStr.trim(),
    isArray: false,
    isObject: false
  }
}

/**
 * Find matching closing parenthesis
 */
function findMatchingCloseParen(
  str: string,
  openPos: number,
  openChar: string,
  closeChar: string
): number {
  let depth = 1
  let pos = openPos + 1

  while (pos < str.length && depth > 0) {
    if (str[pos] === openChar) {
      depth++
    } else if (str[pos] === closeChar) {
      depth--
    }
    pos++
  }

  return depth === 0 ? pos - 1 : -1
}

/**
 * Find matching closing brace for objects
 */
function findMatchingCloseBrace(str: string, openPos: number): number {
  let depth = 1
  let pos = openPos + 1

  while (pos < str.length && depth > 0) {
    if (str[pos] === '{') {
      depth++
    } else if (str[pos] === '}') {
      depth--
    }
    pos++
  }

  return depth === 0 ? pos - 1 : -1
}
