/**
 * PLOON Decoder
 * Reconstructs objects from PLOON records
 */

import type { JsonValue, JsonObject, PloonConfig } from '../types'
import { scan, type ScannedRecord } from './scanner'
import { parseSchema, type ParsedField } from './parser'
import { unescapeValue } from '../shared/string-utils'

interface ParsedPath {
  depth: number
  index?: number  // undefined for objects
  isObject: boolean
}

/**
 * Parse path format
 * - Array: "depth:index" (e.g., "2:1") → { depth: 2, index: 1, isObject: false }
 * - Object: "depth " (e.g., "2 ") → { depth: 2, isObject: true }
 */
function parsePath(path: string, separator: string): ParsedPath {
  const trimmed = path.trim()

  // Check if it's an object path (ends with space, no separator)
  if (!trimmed.includes(separator)) {
    return {
      depth: parseInt(trimmed, 10),
      isObject: true
    }
  }

  // Array path with separator
  const [depthStr, indexStr] = trimmed.split(separator)
  return {
    depth: parseInt(depthStr!, 10),
    index: parseInt(indexStr!, 10),
    isObject: false
  }
}

/**
 * Decode PLOON string to JavaScript object
 */
export function decode(ploonString: string, config: PloonConfig): JsonValue {
  // Scan to get schema and records
  const { schema, records } = scan(ploonString, config)

  // Parse schema
  const parsedSchema = parseSchema(schema, config)

  // Reconstruct object tree
  const result = reconstruct(records, parsedSchema, config)

  return result
}

/**
 * Reconstruct object tree from records using depth-first traversal
 */
function reconstruct(
  records: ScannedRecord[],
  schema: ParsedSchema,
  config: PloonConfig
): JsonValue {
  // Build a tree structure from flat records
  const tree = buildTree(records, schema, config)

  // Return as object with root name as key
  return {
    [schema.rootName]: tree
  }
}

/**
 * Build tree structure from flat records
 * Handles both array elements (depth:index) and nested objects (depth )
 */
function buildTree(
  records: ScannedRecord[],
  schema: ParsedSchema,
  config: PloonConfig
): JsonObject[] {
  const { pathSeparator } = config
  if (records.length === 0) {
    return []
  }

  const rootItems: JsonObject[] = []

  // Stack to track parent context at each depth level
  interface StackFrame {
    obj: JsonObject
    fields: ParsedField[]  // Schema fields at this level (for object children)
    arrayFields?: ParsedField[]  // Schema fields for array children (if different)
    childArray?: JsonObject[]  // Array where child array elements go (if any)
  }
  const stack: StackFrame[] = []

  for (const record of records) {
    const parsedPath = parsePath(record.path, pathSeparator)
    const { depth, isObject } = parsedPath

    // Pop stack back to parent depth
    while (stack.length >= depth) {
      stack.pop()
    }

    if (isObject) {
      // Handle object record
      // For objects, we need the parent's fields to find which object field this belongs to
      const parentFields = depth === 1 ? schema.fields : (stack[stack.length - 1]?.fields || [])

      // Find the first object field that hasn't been populated yet
      // This handles multiple object fields at the same depth (e.g., ceo and headquarters)
      const parentObj = depth === 1 ? null : stack[stack.length - 1]?.obj
      const objectField = parentFields.find(f => {
        if (!f.isObject) return false
        // Check if this field is still empty (not yet populated)
        if (parentObj) {
          const currentValue = parentObj[f.name]
          // Field is empty if it's an empty object or doesn't exist
          return !currentValue || (typeof currentValue === 'object' && Object.keys(currentValue).length === 0)
        }
        return true
      })

      if (!objectField || !objectField.nested) {
        continue // Skip if we can't find object field definition
      }

      // Create object using its own nested schema fields
      const obj = createObjectFromRecord(record, objectField.nested.fields, config)

      // Attach object to parent
      if (depth === 1) {
        // Root level object (shouldn't happen in normal PLOON, but handle it)
        rootItems.push(obj)
      } else {
        const parent = stack[stack.length - 1]
        if (parent) {
          parent.obj[objectField.name] = obj
        }
      }

      // Find array field where children will go
      const arrayField = objectField.nested.fields.find(f => f.isArray)
      const childArray = arrayField ? (obj[arrayField.name] as JsonObject[]) : undefined
      const arrayNestedFields = arrayField?.nested?.fields || []

      // Push onto stack for nested children (using this object's nested fields)
      stack.push({
        obj,
        fields: objectField.nested.fields,  // For object children
        arrayFields: arrayNestedFields,  // For array children
        childArray
      })
    } else {
      // Handle array element record
      // For array elements, use the parent's arrayFields if available, otherwise get from fields
      const fields = depth === 1 ? schema.fields : (stack[stack.length - 1]?.arrayFields || getFieldsForDepth(stack, depth))
      const obj = createObjectFromRecord(record, fields, config)

      // Add to parent's array
      if (depth === 1) {
        rootItems.push(obj)
      } else {
        const parent = stack[stack.length - 1]
        if (parent?.childArray) {
          parent.childArray.push(obj)
        }
      }

      // Find array field where children will go
      const arrayField = fields.find(f => f.isArray)
      const childArray = arrayField ? (obj[arrayField.name] as JsonObject[]) : undefined
      const arrayNestedFields = arrayField?.nested?.fields || []

      // Push onto stack
      stack.push({
        obj,
        fields,  // Keep current fields for object children
        arrayFields: arrayNestedFields,  // Nested array fields for array children
        childArray
      })
    }
  }

  return rootItems
}

/**
 * Create object from record based on schema fields
 */
function createObjectFromRecord(
  record: ScannedRecord,
  fields: ParsedField[],
  config: PloonConfig
): JsonObject {
  const obj: JsonObject = {}
  let valueIndex = 0

  for (const field of fields) {
    if (field.isArray) {
      // Initialize empty array for nested array children
      obj[field.name] = []
    } else if (field.isObject) {
      // Initialize empty object for nested object children
      // Will be filled in by object record at deeper depth
      obj[field.name] = {}
    } else {
      // Primitive field - get value from record
      if (valueIndex < record.values.length) {
        obj[field.name] = parseValue(record.values[valueIndex]!, config)
        valueIndex++
      }
    }
  }

  return obj
}

/**
 * Get fields for a given depth from stack context
 */
function getFieldsForDepth(stack: { fields: ParsedField[] }[], depth: number): ParsedField[] {
  if (depth <= 1 || stack.length === 0) {
    return []
  }

  const parentFrame = stack[stack.length - 1]
  if (!parentFrame) {
    return []
  }

  // Return the nested fields from parent
  return parentFrame.fields
}

/**
 * Get nested fields from array field
 */
function getNestedArrayFields(fields: ParsedField[]): ParsedField[] {
  const arrayField = fields.find(f => f.isArray)
  return arrayField?.nested?.fields || []
}

/**
 * Get nested fields from object field
 */
function getNestedObjectFields(fields: ParsedField[]): ParsedField[] {
  const objectField = fields.find(f => f.isObject)
  return objectField?.nested?.fields || []
}



/**
 * Parse a value string to its JSON type
 */
function parseValue(value: string, config: PloonConfig): JsonValue {
  const unescaped = unescapeValue(value, config)

  // Try to parse as number
  if (/^-?\d+(\.\d+)?$/.test(unescaped)) {
    return parseFloat(unescaped)
  }

  // Check for null
  if (unescaped === 'null') {
    return null
  }

  // Check for boolean
  if (unescaped === 'true') {
    return true
  }
  if (unescaped === 'false') {
    return false
  }

  // Return as string
  return unescaped
}

interface ParsedSchema {
  rootName: string
  count: number
  fields: ParsedField[]
}
