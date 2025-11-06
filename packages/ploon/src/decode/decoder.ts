/**
 * PLOON Decoder
 * Reconstructs objects from PLOON records
 *
 * PLOON Record Format:
 * - Array record: "4:1|value1|value2"  (depth:index|values)
 * - Object record: "4 |value1|value2"  (depth |values)
 * - Empty marker: "4:1|value1|"        (trailing | means empty marker at end)
 */

import type { JsonValue, JsonObject, PloonConfig } from '../types'
import { scan, type ScannedRecord } from './scanner'
import { parseSchema, type ParsedField } from './parser'
import { unescapeValue, splitEscaped } from '../shared/string-utils'

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
 * Reconstruct object tree from records using BFS (level-by-level)
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
 * Group records by field (arrays AND objects) based on index resets and type changes
 */
interface FieldRecordGroup {
  fieldName: string
  fieldIndex: number
  isArray: boolean
  isObject: boolean
  records: ScannedRecord[]
  recordIndices: number[]  // Track original indices
}

function buildRoutingMap(
  childRecords: Array<{ record: ScannedRecord; index: number }>,
  allFields: ParsedField[],  // All complex fields (arrays + objects) in schema order
  presenceMarkers: Set<string>,
  pathSeparator: string
): FieldRecordGroup[] {
  const groups: FieldRecordGroup[] = []

  let currentBatch: Array<{ record: ScannedRecord; index: number }> = []
  let lastIndex = -1
  let lastWasObject = false
  let fieldIdx = 0

  for (const item of childRecords) {
    const { record } = item
    const parsed = parsePath(record.path, pathSeparator)
    const currentIndex = parsed.index !== undefined ? parsed.index : 0
    const isObject = parsed.isObject

    // Detect field boundary:
    // 1. Index reset (array: 3:5 → 3:0)
    // 2. Type change (array → object or object → array)
    // 3. Object after object (each object field gets one record)
    const fieldBoundary =
      (currentBatch.length > 0 && currentIndex <= lastIndex) ||  // Index reset
      (currentBatch.length > 0 && isObject !== lastWasObject) || // Type change
      (lastWasObject && isObject)  // Object after object

    if (fieldBoundary) {
      // Check if this could be the next parent's first child (not our next field)
      // This happens when we've already processed all fields
      if (fieldIdx < allFields.length) {
        const field = allFields[fieldIdx]!
        groups.push({
          fieldName: field.name,
          fieldIndex: fieldIdx,
          isArray: field.isArray,
          isObject: field.isObject,
          records: currentBatch.map(it => it.record),
          recordIndices: currentBatch.map(it => it.index)
        })

        // Move to next field
        fieldIdx++
        currentBatch = []

        // Stop if we've processed all fields (next record belongs to next parent)
        if (fieldIdx >= allFields.length) {
          break
        }
      } else {
        // Already processed all fields, stop here
        break
      }
    }

    currentBatch.push(item)
    lastIndex = currentIndex
    lastWasObject = isObject
  }

  // Save final batch
  if (currentBatch.length > 0 && fieldIdx < allFields.length) {
    const field = allFields[fieldIdx]!
    groups.push({
      fieldName: field.name,
      fieldIndex: fieldIdx,
      isArray: field.isArray,
      isObject: field.isObject,
      records: currentBatch.map(it => it.record),
      recordIndices: currentBatch.map(it => it.index)
    })
  }

  return groups
}

/**
 * Pre-compute parent-child relationships for all records
 * Returns a map from record index to array of child record indices
 */
function buildParentChildMap(
  records: ScannedRecord[],
  pathSeparator: string
): Map<number, number[]> {
  const parentChildMap = new Map<number, number[]>()

  for (let i = 0; i < records.length; i++) {
    const record = records[i]!
    const parsed = parsePath(record.path, pathSeparator)
    const myDepth = parsed.depth

    // Find all children (next depth level) until we hit a sibling or ancestor
    const children: number[] = []
    for (let j = i + 1; j < records.length; j++) {
      const childRecord = records[j]!
      const childParsed = parsePath(childRecord.path, pathSeparator)
      const childDepth = childParsed.depth

      if (childDepth === myDepth + 1) {
        // Direct child
        children.push(j)
      } else if (childDepth <= myDepth) {
        // Sibling or ancestor - stop
        break
      }
      // childDepth > myDepth + 1: deeper descendant, keep going
    }

    parentChildMap.set(i, children)
  }

  return parentChildMap
}

/**
 * Build tree structure from flat records using BFS (Breadth-First Search)
 * Process level by level with sequential consumption of children
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

  // Step 1: Pre-compute parent-child relationships
  const parentChildMap = buildParentChildMap(records, pathSeparator)

  // Step 2: Group all records by depth
  const recordsByDepth = new Map<number, ScannedRecord[]>()
  for (const record of records) {
    const parsed = parsePath(record.path, pathSeparator)
    if (!recordsByDepth.has(parsed.depth)) {
      recordsByDepth.set(parsed.depth, [])
    }
    recordsByDepth.get(parsed.depth)!.push(record)
  }

  const rootItems: JsonObject[] = []

  // Step 3: Process depth 1 - create all root objects
  const depth1Records = recordsByDepth.get(1) || []
  interface ParentInfo {
    obj: JsonObject
    fields: ParsedField[]
    recordIndex: number  // Index in the flat records array
  }
  const currentLevelParents: ParentInfo[] = []

  for (let i = 0; i < records.length; i++) {
    const record = records[i]!
    const parsed = parsePath(record.path, pathSeparator)
    if (parsed.depth === 1 && !parsed.isObject) {
      const { obj } = createObjectFromRecord(record, schema.fields, config)
      rootItems.push(obj)
      currentLevelParents.push({ obj, fields: schema.fields, recordIndex: i })
    }
  }

  // Step 4: Process each subsequent depth level
  let currentDepth = 1
  let parentsAtCurrentDepth = currentLevelParents

  while (parentsAtCurrentDepth.length > 0) {
    const childDepth = currentDepth + 1
    const nextLevelParents: ParentInfo[] = []

    // Process each parent in order
    for (const parent of parentsAtCurrentDepth) {
      const { obj: parentObj, fields: parentFields, recordIndex: parentIdx } = parent
      const presenceMarkers = (parentObj as any).__presenceMarkers__ as Set<string> | undefined || new Set()

      // Get this parent's children from pre-computed map
      const childIndices = parentChildMap.get(parentIdx) || []
      const myChildrenWithIndices = childIndices
        .map(idx => ({ record: records[idx]!, index: idx }))
        .filter(item => {
          const parsed = parsePath(item.record.path, pathSeparator)
          return parsed.depth === childDepth
        })

      if (myChildrenWithIndices.length === 0) continue

      // Get all complex fields (arrays of objects + objects) in schema order
      // EXCLUDE primitive arrays (no child records) and fields with presence markers
      const complexFields = parentFields
        .filter(f => !f.isPrimitiveArray && (f.isArray || f.isObject))
        .filter(f => !presenceMarkers.has(f.name))

      // Use routing map to distribute ALL children (arrays + objects) to fields
      const routingMap = buildRoutingMap(myChildrenWithIndices, complexFields, presenceMarkers, pathSeparator)

      if (routingMap.length === 0) continue

      // Process each field group from routing map
      for (const group of routingMap) {
        const field = complexFields[group.fieldIndex]!

        if (group.isArray) {
          // Array field
          if (!(field.name in parentObj)) {
            parentObj[field.name] = []
          }

          const targetArray = parentObj[field.name] as any[]

          for (let i = 0; i < group.records.length; i++) {
            const rec = group.records[i]!
            const recIdx = group.recordIndices[i]!
            const fields = field.nested?.fields || []

            if (fields.length === 0) {
              // Primitive array
              const value = rec.values.length > 0 ? parseValue(rec.values[0]!, config) : null
              targetArray.push(value)
            } else {
              // Array of objects - add to next level parents
              const { obj: arrayItem } = createObjectFromRecord(rec, fields, config)
              targetArray.push(arrayItem)
              nextLevelParents.push({ obj: arrayItem, fields, recordIndex: recIdx })
            }
          }
        } else if (group.isObject) {
          // Object field
          if (field.nested && group.records.length > 0) {
            const fields = field.nested.fields || []
            const rec = group.records[0]! // Objects only have one record
            const recIdx = group.recordIndices[0]!
            const { obj: nestedObj } = createObjectFromRecord(rec, fields, config)
            parentObj[field.name] = nestedObj
            nextLevelParents.push({ obj: nestedObj, fields, recordIndex: recIdx })
          }
        }
      }
    }

    // Move to next BFS level
    parentsAtCurrentDepth = nextLevelParents
    currentDepth++
  }

  // Cleanup: Remove optional empty arrays/objects that have no presence marker
  for (const item of rootItems) {
    cleanupOptionalFields(item, schema.fields, config)
  }

  return rootItems
}

/**
 * Create object from record based on schema fields
 * Returns both the object and presence markers for optional empty fields
 */
function createObjectFromRecord(
  record: ScannedRecord,
  fields: ParsedField[],
  config: PloonConfig
): { obj: JsonObject; presenceMarkers: Set<string> } {
  const obj: JsonObject = {}
  const presenceMarkers = new Set<string>()

  // Separate fields into primitives and complex types (matches encoder ordering)
  // Primitive arrays are treated as primitives (not complex nested structures)
  const primitiveFields = fields.filter(f => f.isPrimitiveArray || (!f.isArray && !f.isObject))
  const complexFields = fields.filter(f => !f.isPrimitiveArray && (f.isArray || f.isObject))
  const optionalComplexFields = complexFields.filter(f => f.isOptional)

  let valueIndex = 0

  // Process primitive fields first
  for (const field of primitiveFields) {
    if (valueIndex >= record.values.length) break

    const rawValue = record.values[valueIndex]!

    // For optional fields, empty string means "field not present"
    if (field.isOptional && rawValue === '') {
      valueIndex++
      continue
    }

    // Parse value - primitive arrays are comma-separated strings
    if (field.isPrimitiveArray) {
      // Special case: single comma means empty array (not array with empty strings)
      if (rawValue === ',') {
        obj[field.name] = []
      } else {
        // Split by comma (respecting escaped commas)
        // splitEscaped already unescapes, so use parseValueFromUnescaped (not parseValue)
        const elements = splitEscaped(rawValue, ',', config.escapeChar)
        obj[field.name] = elements.map(parseValueFromUnescaped)
      }
    } else {
      obj[field.name] = parseValue(rawValue, config)
    }
    valueIndex++
  }

  /**
   * Optional Complex Field Marker Decoding:
   *
   * When creating an object, we read || markers to determine which optional
   * fields are absent/empty vs present.
   *
   * Decoding rules:
   * 1. Read markers sequentially for optional complex fields
   * 2. || marker means: field is absent or empty (create empty array/object)
   * 3. No marker but more data exists: field has data (will be populated from child records)
   * 4. No more markers/values: all remaining optional fields are absent (don't create them)
   *
   * Example: fields [_collections?, collections?, is_yalla?, variants?]
   *   Marker: ||
   *   Child records: 38 records, then 2 records
   *   → _collections: empty (from marker)
   *   → collections: populate from 38 child records
   *   → is_yalla: populate from 2 child records
   *   → variants: absent (no marker, no data after cutoff)
   */

  // Process || markers for optional arrays/objects
  // Markers appear after primitives, one per optional complex field (up to last non-empty)
  let markersRead = 0
  let hitDataField = false

  for (let i = 0; i < optionalComplexFields.length; i++) {
    const field = optionalComplexFields[i]!

    if (hitDataField) {
      // After hitting the cutoff point, all remaining fields have data
      obj[field.name] = field.isArray ? [] : {}
      continue
    }

    // Check if we have more values to read
    if (valueIndex < record.values.length) {
      const markerValue = record.values[valueIndex]

      if (markerValue === '') {
        // Empty marker || - this field is intentionally empty
        presenceMarkers.add(field.name)
        obj[field.name] = field.isArray ? [] : {}
        valueIndex++
        markersRead++
        continue
      } else {
        // Non-empty value found - we hit the cutoff point
        // This field and all remaining have data
        hitDataField = true
        obj[field.name] = field.isArray ? [] : {}
        continue
      }
    } else {
      // No more values
      if (markersRead > 0) {
        // We read some markers, then ran out - remaining fields have data (after cutoff)
        hitDataField = true
        obj[field.name] = field.isArray ? [] : {}
      } else {
        // No markers read yet - if this is the first field, none of the optional fields exist
        // Don't initialize any of them
        break
      }
    }
  }

  // Initialize required complex fields
  for (const field of complexFields) {
    if (!field.isOptional && !(field.name in obj)) {
      obj[field.name] = field.isArray ? [] : {}
    }
  }

  // Store presence markers on the object for later cleanup
  // Always store markers - they're needed for correct cleanup
  if (presenceMarkers.size > 0) {
    (obj as any).__presenceMarkers__ = presenceMarkers
  }

  return { obj, presenceMarkers }
}

/**
 * Recursively clean up empty optional fields that have no presence marker
 * This runs AFTER all child records have been processed
 */
function cleanupOptionalFields(
  obj: JsonObject,
  fields: ParsedField[],
  config: PloonConfig
): void {
  // Get presence markers stored on this object
  const presenceMarkers = (obj as any).__presenceMarkers__ as Set<string> | undefined

  // Cleanup optional fields
  for (const field of fields) {
    const value = obj[field.name]

    // Only cleanup complex arrays (arrays of objects), not primitive arrays
    if (field.isArray && !field.isPrimitiveArray && Array.isArray(value)) {
      // Recursively cleanup array elements
      if (field.nested?.fields) {
        for (const item of value) {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            cleanupOptionalFields(item as JsonObject, field.nested.fields, config)
          }
        }
      }

      // Remove empty optional arrays WITHOUT presence marker
      // - With presence marker: intentionally empty, KEEP it
      // - Without presence marker: never populated, REMOVE it
      if (field.isOptional && value.length === 0 && !presenceMarkers?.has(field.name)) {
        delete obj[field.name]
      }
    } else if (field.isObject && value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively cleanup nested object
      if (field.nested?.fields) {
        cleanupOptionalFields(value as JsonObject, field.nested.fields, config)
      }

      // Remove empty optional objects WITHOUT presence marker
      // - With presence marker: intentionally empty, KEEP it
      // - Without presence marker: never populated, REMOVE it
      if (field.isOptional && Object.keys(value).filter(k => k !== '__presenceMarkers__').length === 0 && !presenceMarkers?.has(field.name)) {
        delete obj[field.name]
      }
    }
  }

  // Remove the special property
  delete (obj as any).__presenceMarkers__
}

/**
 * Parse a value string to its JSON type
 */
function parseValue(value: string, config: PloonConfig): JsonValue {
  const unescaped = unescapeValue(value, config)
  return parseValueFromUnescaped(unescaped)
}

/**
 * Parse an already-unescaped value to its JSON type
 * Used for primitive array elements that were unescaped by splitEscaped
 */
function parseValueFromUnescaped(value: string): JsonValue {
  // Try to parse as number
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return parseFloat(value)
  }

  // Check for null
  if (value === 'null') {
    return null
  }

  // Check for boolean
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }

  // Empty string stays as empty string (not null)
  // This is important for preserveEmptyFields: true behavior
  return value
}

interface ParsedSchema {
  rootName: string
  count: number
  fields: ParsedField[]
}
