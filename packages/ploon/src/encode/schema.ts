/**
 * Schema Generation
 * Generates PLOON schema from data structure
 */

import type { JsonValue, JsonArray, JsonObject, PloonConfig, SchemaField } from '../types'
import { isJsonArray, isJsonObject, isArrayOfObjects, getAllKeys, analyzeFields } from './normalize'

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
      // Nested array of objects field
      const nestedSchema = generateNestedArraySchema(field.name, field.nested, field.isOptional, config)
      fieldStrings.push(nestedSchema)
    } else if (field.type === 'object' && field.nested && isJsonObject(field.nested)) {
      // Nested object field
      const nestedSchema = generateNestedObjectSchema(field.name, field.nested, field.isOptional, config)
      fieldStrings.push(nestedSchema)
    } else if (field.type === 'primitiveArray') {
      // Array of primitives - mark with #()
      const fieldName = formatFieldName(field.name, field.isOptional, config)
      fieldStrings.push(`${fieldName}${config.arraySizeMarker}${config.fieldsOpen}${config.fieldsClose}`)
    } else {
      // Scalar primitive field
      const fieldName = formatFieldName(field.name, field.isOptional, config)
      fieldStrings.push(fieldName)
    }
  }

  const fieldsStr = fieldStrings.join(config.schemaFieldSeparator)

  // Format: [name#count](fields)
  return `${schemaOpen}${name}${arraySizeMarker}${count}${schemaClose}${fieldsOpen}${fieldsStr}${fieldsClose}`
}

/**
 * Generate schema for nested array (without outer brackets)
 */
function generateNestedArraySchema(
  name: string,
  array: JsonArray,
  isOptional: boolean | undefined,
  config: PloonConfig
): string {
  const { arraySizeMarker, fieldsOpen, fieldsClose } = config
  const count = array.length

  const fields = analyzeArrayFields(array)
  const fieldStrings: string[] = []

  for (const field of fields) {
    if (field.type === 'array' && field.nested && isJsonArray(field.nested)) {
      const nestedSchema = generateNestedArraySchema(field.name, field.nested, field.isOptional, config)
      fieldStrings.push(nestedSchema)
    } else if (field.type === 'object' && field.nested && isJsonObject(field.nested)) {
      const nestedSchema = generateNestedObjectSchema(field.name, field.nested, field.isOptional, config)
      fieldStrings.push(nestedSchema)
    } else if (field.type === 'primitiveArray') {
      // Array of primitives - mark with #()
      const fieldName = formatFieldName(field.name, field.isOptional, config)
      fieldStrings.push(`${fieldName}${arraySizeMarker}${fieldsOpen}${fieldsClose}`)
    } else {
      // Scalar primitive field
      const fieldName = formatFieldName(field.name, field.isOptional, config)
      fieldStrings.push(fieldName)
    }
  }

  const fieldsStr = fieldStrings.join(config.schemaFieldSeparator)

  // Format: name#count(fields) - include count for nested arrays
  // Add optional marker to the array field name if needed
  const formattedName = formatFieldName(name, isOptional, config)
  return `${formattedName}${arraySizeMarker}${count}${fieldsOpen}${fieldsStr}${fieldsClose}`
}

/**
 * Generate schema for nested object
 * Format: name{field1,field2,nested{field3}}
 */
function generateNestedObjectSchema(
  name: string,
  obj: JsonObject,
  isOptional: boolean | undefined,
  config: PloonConfig
): string {
  const keys = Object.keys(obj).sort()

  // Separate into primitive and complex fields (to match encoder ordering)
  // Primitive arrays are treated as primitives, not complex
  const primitiveKeys: string[] = []
  const requiredComplexKeys: string[] = []
  const optionalComplexKeys: string[] = []

  for (const key of keys) {
    const value = obj[key]
    if (isJsonArray(value)) {
      // Check if it's a primitive array or array of objects
      const isPrimArray = value.length === 0 || !isArrayOfObjects(value)
      if (isPrimArray) {
        // Primitive array - treat as primitive field
        primitiveKeys.push(key)
      } else {
        // Array of objects - treat as complex field
        // Non-empty arrays of objects are required
        requiredComplexKeys.push(key)
      }
    } else if (isJsonObject(value) && !isJsonArray(value)) {
      // Empty objects are optional, non-empty are required
      if (Object.keys(value).length === 0) {
        optionalComplexKeys.push(key)
      } else {
        requiredComplexKeys.push(key)
      }
    } else {
      primitiveKeys.push(key)
    }
  }

  const fieldStrings: string[] = []

  // Add primitive fields first (including primitive arrays)
  for (const key of primitiveKeys) {
    const value = obj[key]
    if (isJsonArray(value)) {
      // Primitive array - add #() marker
      fieldStrings.push(`${key}${config.arraySizeMarker}${config.fieldsOpen}${config.fieldsClose}`)
    } else {
      // Scalar primitive
      fieldStrings.push(key)
    }
  }

  // Add required complex fields next
  for (const key of requiredComplexKeys) {
    const value = obj[key]

    if (isJsonArray(value)) {
      const nestedSchema = generateNestedArraySchema(key, value, false, config)
      fieldStrings.push(nestedSchema)
    } else if (isJsonObject(value) && !isJsonArray(value)) {
      const nestedSchema = generateNestedObjectSchema(key, value, false, config)
      fieldStrings.push(nestedSchema)
    }
  }

  // Add optional complex fields last (marked with ?)
  for (const key of optionalComplexKeys) {
    const value = obj[key]

    if (isJsonArray(value)) {
      const nestedSchema = generateNestedArraySchema(key, value, true, config)
      fieldStrings.push(nestedSchema)
    } else if (isJsonObject(value) && !isJsonArray(value)) {
      const nestedSchema = generateNestedObjectSchema(key, value, true, config)
      fieldStrings.push(nestedSchema)
    }
  }

  const fieldsStr = fieldStrings.join(config.schemaFieldSeparator)

  // Format: name{fields} - add optional marker to the object field name if needed
  const formattedName = formatFieldName(name, isOptional, config)
  return `${formattedName}{${fieldsStr}}`
}

/**
 * Format field name with optional marker suffix if needed
 */
function formatFieldName(name: string, isOptional: boolean | undefined, config: PloonConfig): string {
  if (isOptional) {
    return `${name}${config.optionalFieldMarker}`
  }
  return name
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
    const fieldMetadata = analyzeFields(array)
    const fields: SchemaField[] = []

    for (const key of keys) {
      const metadata = fieldMetadata.get(key)
      const isOptional = metadata?.isOptional ?? false

      // Check if this field contains nested arrays
      const nestedArray = findNestedArray(array, key)
      if (nestedArray) {
        fields.push({ name: key, type: 'array', isOptional, nested: nestedArray })
        continue
      }

      // Check if this field contains nested objects
      const nestedObject = findNestedObject(array, key)
      if (nestedObject) {
        fields.push({ name: key, type: 'object', isOptional, nested: nestedObject })
        continue
      }

      // Check if this field is an array of primitives
      const firstValue = array.find(obj => key in obj)?.[key]
      if (isJsonArray(firstValue)) {
        // Check if it's an array of objects (only for non-empty arrays)
        // Empty arrays default to primitive arrays (encoded inline)
        const isPrimArray = firstValue.length === 0 || !isArrayOfObjects(firstValue)
        if (isPrimArray) {
          // Array of primitives - encode inline as comma-separated
          fields.push({ name: key, type: 'primitiveArray', isOptional })
          continue
        }
        // Array of objects - already handled by findNestedArray above
      }

      // Scalar primitive field
      fields.push({ name: key, type: 'primitive', isOptional })
    }

    // Sort fields for optimal encoding order:
    // 1. Required primitives (including primitive arrays)
    // 2. Optional primitives (including primitive arrays)
    // 3. Required complex (arrays of objects/objects)
    // 4. Optional complex (arrays of objects/objects)
    return fields.sort((a, b) => {
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
  }

  // Not an array of objects - no fields
  return []
}

/**
 * Find nested array for a given key across all objects
 * Only returns array if MAJORITY of present values are arrays (handles type inconsistencies)
 */
function findNestedArray(objects: JsonObject[], key: string): JsonArray | undefined {
  let arrayCount = 0
  let primitiveCount = 0
  let objectCount = 0
  let foundArray: JsonArray | undefined

  for (const obj of objects) {
    if (!(key in obj)) continue

    const value = obj[key]
    if (isJsonArray(value)) {
      arrayCount++
      // Prefer non-empty arrays for schema structure
      if (!foundArray || (foundArray.length === 0 && value.length > 0)) {
        foundArray = value
      }
    } else if (isJsonObject(value)) {
      objectCount++
    } else {
      primitiveCount++
    }
  }

  // Only treat as array if arrays are the majority
  // AND the array contains objects (not primitives)
  if (arrayCount > primitiveCount && arrayCount > objectCount) {
    // Only return if it's an array of objects
    // Arrays of primitives are encoded inline as comma-separated values (more compact)
    // Empty arrays can't be determined, so default to primitive arrays
    if (foundArray && foundArray.length > 0 && isArrayOfObjects(foundArray)) {
      return foundArray
    }
  }

  return undefined
}

/**
 * Find nested object for a given key across all objects
 * Only returns object if MAJORITY of present values are objects (handles type inconsistencies)
 */
function findNestedObject(objects: JsonObject[], key: string): JsonObject | undefined {
  let arrayCount = 0
  let primitiveCount = 0
  let objectCount = 0
  let foundObject: JsonObject | undefined

  for (const obj of objects) {
    if (!(key in obj)) continue

    const value = obj[key]
    if (isJsonObject(value) && !isJsonArray(value)) {
      objectCount++
      // Prefer non-empty objects for schema structure
      if (!foundObject || (Object.keys(foundObject).length === 0 && Object.keys(value).length > 0)) {
        foundObject = value
      }
    } else if (isJsonArray(value)) {
      arrayCount++
    } else {
      primitiveCount++
    }
  }

  // Only treat as object if objects are the majority
  if (objectCount > primitiveCount && objectCount > arrayCount) {
    return foundObject
  }

  return undefined
}
