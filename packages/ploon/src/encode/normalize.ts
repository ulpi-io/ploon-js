/**
 * Input Normalization
 * Converts unknown input to JsonValue (adapted from TOON)
 */

import type { JsonValue, JsonArray, JsonObject, JsonPrimitive } from '../types'

/**
 * Normalize unknown value to JsonValue
 * Handles Date, BigInt, Set, Map, and other special types
 */
export function normalizeValue(value: unknown): JsonValue {
  // null
  if (value === null) {
    return null
  }

  // Primitives
  if (typeof value === 'string' || typeof value === 'boolean') {
    return value
  }

  // Numbers: canonicalize -0 to 0, handle NaN and Infinity
  if (typeof value === 'number') {
    if (Object.is(value, -0)) {
      return 0
    }
    if (!Number.isFinite(value)) {
      return null
    }
    return value
  }

  // BigInt → number (if safe) or string
  if (typeof value === 'bigint') {
    // Try to convert to number if within safe integer range
    if (value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER) {
      return Number(value)
    }
    // Otherwise convert to string
    return value.toString()
  }

  // Date → ISO string
  if (value instanceof Date) {
    return value.toISOString()
  }

  // Array
  if (Array.isArray(value)) {
    return value.map(normalizeValue)
  }

  // Set → array
  if (value instanceof Set) {
    return Array.from(value).map(normalizeValue)
  }

  // Map → object
  if (value instanceof Map) {
    return Object.fromEntries(
      Array.from(value, ([k, v]) => [String(k), normalizeValue(v)])
    )
  }

  // Plain object
  if (isPlainObject(value)) {
    const result: Record<string, JsonValue> = {}

    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        result[key] = normalizeValue(value[key])
      }
    }

    return result
  }

  // Fallback: function, symbol, undefined, or other → null
  return null
}

/**
 * Type guards
 */

export function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return (
    value === null
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
  )
}

export function isJsonArray(value: unknown): value is JsonArray {
  return Array.isArray(value)
}

export function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === null || prototype === Object.prototype
}

/**
 * Array type detection
 */

export function isArrayOfPrimitives(value: JsonArray): value is JsonPrimitive[] {
  return value.every(item => isJsonPrimitive(item))
}

export function isArrayOfArrays(value: JsonArray): value is JsonArray[] {
  return value.every(item => isJsonArray(item))
}

export function isArrayOfObjects(value: JsonArray): value is JsonObject[] {
  return value.every(item => isJsonObject(item))
}

/**
 * Check if array of objects has uniform schema
 */
export function hasUniformSchema(objects: JsonObject[]): boolean {
  if (objects.length === 0) {
    return true
  }

  const firstKeys = Object.keys(objects[0]!).sort()

  return objects.every(obj => {
    const keys = Object.keys(obj).sort()
    return (
      keys.length === firstKeys.length &&
      keys.every((key, i) => key === firstKeys[i])
    )
  })
}

/**
 * Get all keys from array of objects (union)
 */
export function getAllKeys(objects: JsonObject[]): string[] {
  const keySet = new Set<string>()

  for (const obj of objects) {
    for (const key of Object.keys(obj)) {
      keySet.add(key)
    }
  }

  return Array.from(keySet).sort()
}

/**
 * Analyze fields in array of objects to determine which are required vs optional
 * A field is optional if it's missing from any object OR empty (array/object with no content) in any object
 * A field is required only if it appears in ALL objects AND always has content
 */
export function analyzeFields(objects: JsonObject[]): Map<string, { isOptional: boolean }> {
  const fieldMetadata = new Map<string, { isOptional: boolean }>()

  if (objects.length === 0) {
    return fieldMetadata
  }

  // Count how many objects have each field and track if field is ever empty
  const fieldCounts = new Map<string, number>()
  const fieldEverEmpty = new Map<string, boolean>()

  for (const obj of objects) {
    for (const key of Object.keys(obj)) {
      fieldCounts.set(key, (fieldCounts.get(key) || 0) + 1)

      // Check if this field is empty (array with 0 elements or object with 0 keys)
      const value = obj[key]
      const isEmpty = (isJsonArray(value) && value.length === 0)
                   || (isJsonObject(value) && !isJsonArray(value) && Object.keys(value).length === 0)

      if (isEmpty) {
        fieldEverEmpty.set(key, true)
      }
    }
  }

  // Determine if each field is optional
  const totalObjects = objects.length

  for (const [fieldName, count] of fieldCounts.entries()) {
    const isMissingSomewhere = count < totalObjects
    const isEmptySomewhere = fieldEverEmpty.get(fieldName) || false

    fieldMetadata.set(fieldName, {
      isOptional: isMissingSomewhere || isEmptySomewhere
    })
  }

  return fieldMetadata
}
