/**
 * PLOON - Path-Oriented Notation
 * The most token-efficient format for nested hierarchical data
 */

// Core API
export { stringify } from './core/stringify'
export { parse } from './core/parse'
export { minify } from './core/minify'
export { prettify } from './core/prettify'
export { isValid, validate } from './core/validate'

// Input Parsers
export { fromJSON, isJSON, toJSON } from './parsers/json'
export { fromXML, isXML, toXML } from './parsers/xml'
export { fromYAML, isYAML, toYAML } from './parsers/yaml'

// Configuration
export { PLOON_STANDARD, PLOON_COMPACT } from './constants'
export { resolveConfig, validateConfig, detectFormat, detectConfig } from './config'

// Types
export type {
  JsonValue,
  JsonObject,
  JsonArray,
  JsonPrimitive,
  PloonConfig,
  StringifyOptions,
  ParseOptions,
  ValidationResult
} from './types'
