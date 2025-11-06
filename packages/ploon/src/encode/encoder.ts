/**
 * PLOON Encoder
 * Main encoding logic - converts data to PLOON format
 *
 * PLOON Record Format:
 * - Array record: "4:1|value1|value2"  (depth:index|values)
 * - Object record: "4 |value1|value2"  (depth |values)
 * - Empty marker: "4:1|value1|"        (trailing | means empty marker at end)
 */

import type { JsonValue, JsonArray, JsonObject, PloonConfig, SchemaField } from '../types'
import { isJsonArray, isJsonObject, isArrayOfObjects, getAllKeys, analyzeFields } from './normalize'
import { generateSchema } from './schema'
import { PathWriter } from './path-writer'
import { formatValue, formatPrimitiveArray } from '../shared/string-utils'

/**
 * Encode data to PLOON format
 */
export function encode(data: JsonValue, config: PloonConfig): string {
  // Generate schema
  const schema = generateSchema(data, config)

  // Find root array (auto-wraps single objects/primitives)
  const rootArray = findRootArray(data)

  // Encode records
  const records = encodeArray(rootArray, new PathWriter(config), config)

  // Combine schema and records
  const { recordSeparator } = config
  const result = schema + recordSeparator + recordSeparator + records.join(recordSeparator)

  return result
}

/**
 * Find root array in data
 * Auto-wraps single objects/primitives into arrays
 */
function findRootArray(data: JsonValue): JsonArray {
  if (isJsonArray(data)) {
    return data
  }

  if (isJsonObject(data)) {
    for (const value of Object.values(data)) {
      if (isJsonArray(value)) {
        return value
      }
    }
    // No array found - wrap the object itself as a single-element array
    return [data]
  }

  // Primitive value - wrap as single-element array
  return [data]
}

/**
 * Encode an array to records
 */
function encodeArray(
  array: JsonArray,
  pathWriter: PathWriter,
  config: PloonConfig
): string[] {
  const records: string[] = []

  if (!isArrayOfObjects(array)) {
    // Array of primitives (strings, numbers, booleans, null)
    const { fieldDelimiter } = config

    array.forEach((value, index) => {
      const itemIndex = index + 1 // 1-based indexing
      pathWriter.push(itemIndex)

      const path = pathWriter.getCurrentPath()
      const formattedValue = formatValue(value, config)
      const record = `${path}${fieldDelimiter}${formattedValue}`
      records.push(record)

      pathWriter.pop()
    })

    return records
  }

  // Get all keys and analyze which are optional
  const keys = getAllKeys(array)
  const fieldMetadata = analyzeFields(array)

  // Build SchemaField list
  const fields: SchemaField[] = keys.map(key => {
    const value = array.find(obj => obj[key] !== undefined)?.[key]
    const isOptional = fieldMetadata.get(key)?.isOptional ?? false

    // Determine field type
    // Arrays of objects are complex (need child records)
    // Arrays of primitives are treated as primitive values (comma-separated)
    // Empty arrays default to primitive arrays (can't determine type)
    if (isJsonArray(value)) {
      // Check if it's an array of objects (only for non-empty arrays)
      if (value.length > 0 && isArrayOfObjects(value)) {
        return { name: key, type: 'array', isOptional, nested: value }
      } else {
        // Array of primitives OR empty array (default to primitive)
        return { name: key, type: 'primitiveArray', isOptional }
      }
    } else if (isJsonObject(value) && !isJsonArray(value)) {
      return { name: key, type: 'object', isOptional, nested: value }
    } else {
      return { name: key, type: 'primitive', isOptional }
    }
  })

  // Sort fields to match schema ordering:
  // 1. Required primitives (including primitive arrays)
  // 2. Optional primitives (including primitive arrays)
  // 3. Required complex (arrays of objects/objects)
  // 4. Optional complex (arrays of objects/objects)
  fields.sort((a, b) => {
    const aIsPrimitive = a.type === 'primitive' || a.type === 'primitiveArray'
    const bIsPrimitive = b.type === 'primitive' || b.type === 'primitiveArray'

    // Primitives before complex
    if (aIsPrimitive !== bIsPrimitive) {
      return aIsPrimitive ? -1 : 1
    }

    // Within same type category, required before optional
    if (a.isOptional !== b.isOptional) {
      return a.isOptional ? 1 : -1
    }

    return 0
  })

  // Encode each object
  array.forEach((obj, index) => {
    const itemIndex = index + 1 // 1-based indexing
    pathWriter.push(itemIndex)

    // Encode this object
    const record = encodeObject(obj, fields, pathWriter, config)
    records.push(record)

    // Encode nested structures (only for complex types, not primitive arrays)
    for (const field of fields) {
      // Skip primitive fields (including arrays of primitives)
      if (field.type === 'primitive') continue

      const value = obj[field.name]

      // Encode nested arrays of objects (including empty arrays)
      if (field.type === 'array' && isJsonArray(value)) {
        const nestedRecords = encodeArray(value, pathWriter, config)
        records.push(...nestedRecords)
      }
      // Encode nested objects
      else if (field.type === 'object' && isJsonObject(value) && !isJsonArray(value)) {
        const nestedRecords = encodeNestedObject(value, pathWriter, config)
        records.push(...nestedRecords)
      }
    }

    pathWriter.pop()
  })

  return records
}

/**
 * Encode a single object to a record
 */
function encodeObject(
  obj: JsonObject,
  fields: SchemaField[],
  pathWriter: PathWriter,
  config: PloonConfig
): string {
  const { fieldDelimiter } = config
  const path = pathWriter.getCurrentPath()
  const values: string[] = [path]

  // Separate fields into primitives and complex types (arrays/objects)
  const primitiveFields = fields.filter(f => f.type === 'primitive' || f.type === 'primitiveArray')
  const complexFields = fields.filter(f => f.type === 'array' || f.type === 'object')

  // Add primitive field values first
  for (const field of primitiveFields) {
    const value = obj[field.name]

    if (field.isOptional && !(field.name in obj)) {
      // Field is absent - write empty string
      values.push('')
    } else if (field.type === 'primitiveArray' && Array.isArray(value)) {
      if (value.length === 0) {
        // Empty array that IS present - write special empty array marker
        // We use a single comma to distinguish from absent (empty string)
        values.push(',')
      } else {
        // Non-empty primitive array - format with null handling and preserveEmptyFields
        values.push(formatPrimitiveArray(value, config, config.preserveEmptyFields))
      }
    } else {
      // Scalar primitive field - write value
      values.push(formatValue(value, config, false))
    }
  }

  /**
   * Optional Complex Field Marker Strategy:
   *
   * Optional arrays/objects are placed at the END of the schema in alphabetical order.
   * Their data comes as child records, but we need to tell the decoder which fields
   * are absent vs present.
   *
   * Encoding rules:
   * 1. Find the LAST optional field that has data (non-empty or non-absent)
   * 2. For each optional field UP TO that last one:
   *    - If ABSENT or EMPTY: write || marker
   *    - If HAS DATA: write nothing (data comes as child records)
   * 3. After the last non-empty field: stop (trailing absent fields omitted)
   *
   * Example with fields [_collections?, collections?, is_yalla?, variants?]:
   *   Hit has collections=38, is_yalla=2  (no _collections, no variants)
   *   → Last non-empty is is_yalla at index 2
   *   → Write: || (for _collections) then stop
   *   → Child records: 38 for collections, 2 for is_yalla
   */

  // For complex fields (arrays/objects): find last present optional position
  // "Present" means the field exists in the object, even if it's empty
  let lastPresentOptionalIndex = -1
  for (let i = 0; i < complexFields.length; i++) {
    const field = complexFields[i]!
    if (!field.isOptional) continue

    // Check if field exists (even if empty)
    if (field.name in obj) {
      lastPresentOptionalIndex = i
    }
  }

  // Add || markers for optional arrays/objects up to last present position
  for (let i = 0; i < complexFields.length; i++) {
    const field = complexFields[i]!

    if (!field.isOptional) continue

    // Stop adding markers after last present optional (trailing absent fields omitted)
    if (i > lastPresentOptionalIndex) break

    // Only mark fields that EXIST and are EMPTY (not absent fields)
    // Absent fields get no marker - decoder will skip them
    if (field.name in obj) {
      const value = obj[field.name]
      const isEmpty = (field.type === 'array' && isJsonArray(value) && value.length === 0) || // EMPTY array
                      (field.type === 'object' && isJsonObject(value) && !isJsonArray(value) && Object.keys(value).length === 0) // EMPTY object

      if (isEmpty) {
        values.push('')  // || marker for EMPTY (but present) field
      }
    }
  }

  return values.join(fieldDelimiter)
}

/**
 * Encode a nested object to records
 * Objects use "depth " path notation (no index)
 */
function encodeNestedObject(
  obj: JsonObject,
  pathWriter: PathWriter,
  config: PloonConfig
): string[] {
  const records: string[] = []

  // Push object path (no index)
  pathWriter.pushObject()

  // Get all keys from this object
  const keys = Object.keys(obj).sort()

  // Encode this object's primitive fields
  const { fieldDelimiter } = config
  const path = pathWriter.getCurrentPath()
  const values: string[] = [path]

  // Separate into primitives and complex types
  // Primitive arrays (arrays of primitives) are treated as primitive values
  // Arrays of objects are complex types
  const primitiveKeys: string[] = []
  const complexKeys: string[] = []

  for (const key of keys) {
    const value = obj[key]
    if (isJsonArray(value)) {
      // Check if it's an array of objects or primitives
      // Empty arrays default to primitive arrays (simpler/more common)
      const isPrimArray = value.length === 0 || !isArrayOfObjects(value)
      if (isPrimArray) {
        primitiveKeys.push(key)
      } else {
        complexKeys.push(key)
      }
    } else if (isJsonObject(value) && !isJsonArray(value)) {
      complexKeys.push(key)
    } else {
      primitiveKeys.push(key)
    }
  }

  // Add primitive values first
  for (const key of primitiveKeys) {
    const value = obj[key]

    // Handle primitive arrays with special empty array marker
    if (isJsonArray(value)) {
      if (value.length === 0) {
        // Empty array - use special marker ","
        values.push(',')
      } else {
        // Non-empty primitive array - format with null handling and preserveEmptyFields
        values.push(formatPrimitiveArray(value, config, config.preserveEmptyFields))
      }
    } else {
      // Scalar primitive
      values.push(formatValue(value, config))
    }
  }

  // Find last non-empty complex field
  let lastNonEmptyIndex = -1
  for (let i = 0; i < complexKeys.length; i++) {
    const key = complexKeys[i]!
    const value = obj[key]
    const isEmpty = (isJsonArray(value) && value.length === 0)
                 || (isJsonObject(value) && !isJsonArray(value) && Object.keys(value).length === 0)

    if (!isEmpty) {
      lastNonEmptyIndex = i
    }
  }

  // Add || markers for empty arrays/objects up to last non-empty
  for (let i = 0; i <= lastNonEmptyIndex; i++) {
    const key = complexKeys[i]!
    const value = obj[key]
    const isEmpty = (isJsonArray(value) && value.length === 0)
                 || (isJsonObject(value) && !isJsonArray(value) && Object.keys(value).length === 0)

    if (isEmpty) {
      values.push('')  // Empty marker ||
    }
  }

  records.push(values.join(fieldDelimiter))

  // Recursively encode nested structures
  // Only encode complex types (arrays of objects, nested objects)
  // Primitive arrays are already encoded inline above
  for (const key of keys) {
    const value = obj[key]

    // Encode nested arrays of objects (not primitive arrays)
    if (isJsonArray(value)) {
      // Check if it's an array of objects (not primitives)
      const isPrimArray = value.length === 0 || !isArrayOfObjects(value)
      if (!isPrimArray) {
        // Array of objects - encode as nested records
        const nestedRecords = encodeArray(value, pathWriter, config)
        records.push(...nestedRecords)
      }
      // Primitive arrays are already encoded inline, skip them
    }
    // Encode nested objects
    else if (isJsonObject(value) && !isJsonArray(value)) {
      const nestedRecords = encodeNestedObject(value, pathWriter, config)
      records.push(...nestedRecords)
    }
  }

  pathWriter.pop()

  return records
}
