/**
 * Conversion Logic
 * Handles all format conversions
 */

import {
  stringify,
  parse,
  minify,
  prettify,
  fromJSON,
  fromXML,
  fromYAML,
  toJSON,
  toXML,
  toYAML,
  isValid,
  type PloonConfig,
  type JsonValue
} from 'ploon'

export interface ConvertOptions {
  inputFormat?: 'json' | 'xml' | 'yaml' | 'ploon' | 'auto'
  outputFormat?: 'json' | 'xml' | 'yaml'
  minify?: boolean
  prettify?: boolean
  validate?: boolean
  showStats?: boolean
  config?: Partial<PloonConfig>
}

/**
 * Main conversion function
 */
export async function convert(input: string, options: ConvertOptions): Promise<string> {
  const { inputFormat = 'auto', outputFormat, minify: shouldMinify, prettify: shouldPrettify, validate: shouldValidate } = options

  // Validation mode
  if (shouldValidate) {
    if (!isValid(input)) {
      throw new Error('Invalid PLOON format')
    }
    return input
  }

  // If output format is specified, we're converting FROM PLOON
  if (outputFormat) {
    return convertFromPloon(input, outputFormat, options)
  }

  // Otherwise, we're converting TO PLOON
  return convertToPloon(input, inputFormat, shouldMinify, shouldPrettify, options)
}

/**
 * Convert to PLOON from various formats
 */
function convertToPloon(
  input: string,
  format: string,
  shouldMinify?: boolean,
  shouldPrettify?: boolean,
  options?: ConvertOptions
): string {
  // Parse input to object
  let data: unknown

  if (format === 'json' || format === 'auto') {
    try {
      data = fromJSON(input)
    } catch (error) {
      throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else if (format === 'xml') {
    try {
      data = fromXML(input)
    } catch (error) {
      throw new Error(`Invalid XML: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else if (format === 'yaml') {
    try {
      data = fromYAML(input)
    } catch (error) {
      throw new Error(`Invalid YAML: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else if (format === 'ploon') {
    // Already PLOON, just apply transformations
    if (shouldMinify) {
      return minify(input)
    }
    if (shouldPrettify) {
      return prettify(input)
    }
    return input
  } else {
    throw new Error(`Unsupported input format: ${format}`)
  }

  // Convert to PLOON
  const ploonFormat = shouldMinify ? 'compact' : 'standard'
  const ploon = stringify(data, {
    format: ploonFormat,
    config: options?.config
  })

  return ploon
}

/**
 * Convert from PLOON to various formats
 */
function convertFromPloon(
  input: string,
  format: 'json' | 'xml' | 'yaml',
  options?: ConvertOptions
): string {
  // Parse PLOON to object
  let data: JsonValue

  try {
    data = parse(input, {
      config: options?.config
    })
  } catch (error) {
    throw new Error(`Failed to parse PLOON: ${error instanceof Error ? error.message : String(error)}`)
  }

  // Convert to output format
  if (format === 'json') {
    return toJSON(data, true) // Pretty JSON
  } else if (format === 'xml') {
    return toXML(data, true) // Pretty XML
  } else if (format === 'yaml') {
    return toYAML(data, true) // Pretty YAML
  } else {
    throw new Error(`Unsupported output format: ${format}`)
  }
}
