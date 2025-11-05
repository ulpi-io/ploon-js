/**
 * PLOON Encoder
 * Main encoding logic - converts data to PLOON format
 */

import type { JsonValue, JsonArray, JsonObject, PloonConfig } from '../types'
import { isJsonArray, isJsonObject, isArrayOfObjects, getAllKeys } from './normalize'
import { generateSchema } from './schema'
import { PathWriter } from './path-writer'
import { formatValue } from '../shared/string-utils'

/**
 * Encode data to PLOON format
 */
export function encode(data: JsonValue, config: PloonConfig): string {
  // Generate schema
  const schema = generateSchema(data, config)

  // Find root array
  const rootArray = findRootArray(data)

  if (!rootArray) {
    throw new Error('Data must contain at least one array')
  }

  // Encode records
  const records = encodeArray(rootArray, new PathWriter(config), config)

  // Combine schema and records
  const { recordSeparator } = config
  const result = schema + recordSeparator + recordSeparator + records.join(recordSeparator)

  return result
}

/**
 * Find root array in data
 */
function findRootArray(data: JsonValue): JsonArray | null {
  if (isJsonArray(data)) {
    return data
  }

  if (isJsonObject(data)) {
    for (const value of Object.values(data)) {
      if (isJsonArray(value)) {
        return value
      }
    }
  }

  return null
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
    // Not an array of objects - can't encode
    return records
  }

  // Get all keys
  const keys = getAllKeys(array)

  // Encode each object
  array.forEach((obj, index) => {
    const itemIndex = index + 1 // 1-based indexing
    pathWriter.push(itemIndex)

    // Encode this object
    const record = encodeObject(obj, keys, pathWriter, config)
    records.push(record)

    // Encode nested structures
    for (const key of keys) {
      const value = obj[key]

      // Encode nested arrays
      if (isJsonArray(value) && value.length > 0) {
        const nestedRecords = encodeArray(value, pathWriter, config)
        records.push(...nestedRecords)
      }
      // Encode nested objects
      else if (isJsonObject(value) && !isJsonArray(value)) {
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
  keys: string[],
  pathWriter: PathWriter,
  config: PloonConfig
): string {
  const { fieldDelimiter } = config
  const path = pathWriter.getCurrentPath()
  const values: string[] = [path]

  // Add values for each key (excluding nested arrays and objects)
  for (const key of keys) {
    const value = obj[key]

    // Skip nested arrays (they're encoded separately)
    if (isJsonArray(value)) {
      continue
    }

    // Skip nested objects (they're encoded separately)
    if (isJsonObject(value) && !isJsonArray(value)) {
      continue
    }

    values.push(formatValue(value, config))
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

  for (const key of keys) {
    const value = obj[key]

    // Skip nested arrays and objects for now
    if (isJsonArray(value) || (isJsonObject(value) && !isJsonArray(value))) {
      continue
    }

    values.push(formatValue(value, config))
  }

  records.push(values.join(fieldDelimiter))

  // Recursively encode nested structures
  for (const key of keys) {
    const value = obj[key]

    // Encode nested arrays
    if (isJsonArray(value) && value.length > 0) {
      const nestedRecords = encodeArray(value, pathWriter, config)
      records.push(...nestedRecords)
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
