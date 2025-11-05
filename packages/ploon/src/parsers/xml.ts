/**
 * XML Parser - Uses fast-xml-parser
 */

import { XMLParser, XMLValidator, XMLBuilder } from 'fast-xml-parser'
import type { JsonValue } from '../types'

/**
 * Parse XML string to JavaScript object
 */
export function fromXML(input: string): JsonValue {
  // Validate first
  const validation = XMLValidator.validate(input)

  if (validation !== true) {
    const error = validation.err
    throw new Error(`Invalid XML at line ${error.line}: ${error.msg}`)
  }

  // Parse
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true,
    parseTagValue: true,
    trimValues: true
  })

  try {
    return parser.parse(input) as JsonValue
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`XML parsing failed: ${message}`)
  }
}

/**
 * Check if a string is valid XML
 */
export function isXML(input: string): boolean {
  const validation = XMLValidator.validate(input)
  return validation === true
}

/**
 * Convert JavaScript object to XML string
 */
export function toXML(value: JsonValue, pretty = false): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    format: pretty,
    indentBy: pretty ? '  ' : '',
    suppressEmptyNode: true
  })

  try {
    return builder.build(value)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`XML building failed: ${message}`)
  }
}
