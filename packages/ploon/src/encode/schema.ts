/**
 * Schema Generation
 * Generates PLOON schema from data structure
 */

import type { JsonValue, JsonArray, JsonObject, PloonConfig, SchemaField } from '../types'
import { isJsonArray, isJsonObject, isArrayOfObjects, getAllKeys } from './normalize'

/**
 * Generate PLOON schema from data
 * Example: [products#2](id,name,price|colors#(name,hex|sizes#(size,sku)))
 */
export function generateSchema(
  data: JsonValue,
  config: PloonConfig
): string {
  // Find the root array
  const { name, array } = findRootArray(data)

  if (!array) {
    throw new Error('Data must contain at least one array to generate PLOON schema')
  }

  // Generate schema for the root array
  const schema = generateArraySchema(name, array, config)

  return schema
}

/**
 * Find the root array in the data
 * If data is an object with one array property, use that
 * If data is an array, name it 'root'
 */
function findRootArray(data: JsonValue): { name: string; array: JsonArray | null } {
  if (isJsonArray(data)) {
    return { name: 'root', array: data }
  }

  if (isJsonObject(data)) {
    // Find the first array property
    for (const [key, value] of Object.entries(data)) {
      if (isJsonArray(value)) {
        return { name: key, array: value }
      }
    }
  }

  return { name: 'root', array: null }
}

/**
 * Generate schema for an array
 */
function generateArraySchema(
  name: string,
  array: JsonArray,
  config: PloonConfig
): string {
  const {
    arraySizeMarker,
    fieldsOpen,
    fieldsClose,
    nestedSeparator,
    schemaOpen,
    schemaClose
  } = config

  const count = array.length
  const fields = analyzeArrayFields(array)

  // Format fields
  const fieldStrings: string[] = []

  for (const field of fields) {
    if (field.type === 'array' && field.nested && isJsonArray(field.nested)) {
      // Nested array field
      const nestedSchema = generateNestedArraySchema(field.name, field.nested, config)
      fieldStrings.push(nestedSchema)
    } else if (field.type === 'object' && field.nested && isJsonObject(field.nested)) {
      // Nested object field
      const nestedSchema = generateNestedObjectSchema(field.name, field.nested, config)
      fieldStrings.push(nestedSchema)
    } else {
      // Simple field
      fieldStrings.push(field.name)
    }
  }

  const fieldsStr = fieldStrings.join(',')

  // Format: [name#count](fields)
  return `${schemaOpen}${name}${arraySizeMarker}${count}${schemaClose}${fieldsOpen}${fieldsStr}${fieldsClose}`
}

/**
 * Generate schema for nested array (without outer brackets)
 */
function generateNestedArraySchema(
  name: string,
  array: JsonArray,
  config: PloonConfig
): string {
  const { arraySizeMarker, fieldsOpen, fieldsClose } = config

  const fields = analyzeArrayFields(array)
  const fieldStrings: string[] = []

  for (const field of fields) {
    if (field.type === 'array' && field.nested && isJsonArray(field.nested)) {
      const nestedSchema = generateNestedArraySchema(field.name, field.nested, config)
      fieldStrings.push(nestedSchema)
    } else if (field.type === 'object' && field.nested && isJsonObject(field.nested)) {
      const nestedSchema = generateNestedObjectSchema(field.name, field.nested, config)
      fieldStrings.push(nestedSchema)
    } else {
      fieldStrings.push(field.name)
    }
  }

  const fieldsStr = fieldStrings.join(',')

  // Format: name#(fields)
  return `${name}${arraySizeMarker}${fieldsOpen}${fieldsStr}${fieldsClose}`
}

/**
 * Generate schema for nested object
 * Format: name{field1,field2,nested{field3}}
 */
function generateNestedObjectSchema(
  name: string,
  obj: JsonObject,
  config: PloonConfig
): string {
  const keys = Object.keys(obj).sort()
  const fieldStrings: string[] = []

  for (const key of keys) {
    const value = obj[key]

    if (isJsonArray(value) && value.length > 0) {
      // Nested array within object
      const nestedSchema = generateNestedArraySchema(key, value, config)
      fieldStrings.push(nestedSchema)
    } else if (isJsonObject(value) && !isJsonArray(value)) {
      // Nested object within object
      const nestedSchema = generateNestedObjectSchema(key, value, config)
      fieldStrings.push(nestedSchema)
    } else {
      // Primitive field
      fieldStrings.push(key)
    }
  }

  const fieldsStr = fieldStrings.join(',')

  // Format: name{fields}
  return `${name}{${fieldsStr}}`
}

/**
 * Analyze array to determine fields and nested arrays/objects
 */
function analyzeArrayFields(array: JsonArray): SchemaField[] {
  if (array.length === 0) {
    return []
  }

  // Get all keys if array of objects
  if (isArrayOfObjects(array)) {
    const keys = getAllKeys(array)
    const fields: SchemaField[] = []

    for (const key of keys) {
      // Check if this field contains nested arrays
      const nestedArray = findNestedArray(array, key)
      if (nestedArray) {
        fields.push({ name: key, type: 'array', nested: nestedArray })
        continue
      }

      // Check if this field contains nested objects
      const nestedObject = findNestedObject(array, key)
      if (nestedObject) {
        fields.push({ name: key, type: 'object', nested: nestedObject })
        continue
      }

      // Primitive field
      fields.push({ name: key, type: 'primitive' })
    }

    return fields
  }

  // Not an array of objects - no fields
  return []
}

/**
 * Find nested array for a given key across all objects
 */
function findNestedArray(objects: JsonObject[], key: string): JsonArray | undefined {
  for (const obj of objects) {
    const value = obj[key]
    if (isJsonArray(value) && value.length > 0) {
      return value
    }
  }

  return undefined
}

/**
 * Find nested object for a given key across all objects
 */
function findNestedObject(objects: JsonObject[], key: string): JsonObject | undefined {
  for (const obj of objects) {
    const value = obj[key]
    if (isJsonObject(value) && !isJsonArray(value)) {
      return value
    }
  }

  return undefined
}
