#!/usr/bin/env node
/**
 * Benchmark ecommerce dataset with just 1 record
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { encoding_for_model } from 'tiktoken'
import { stringify, minify, fromJSON } from '../../packages/ploon/dist/index.js'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import yaml from 'yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const TEMP_DIR = join(process.cwd(), 'benchmarks/data/temp-1record')
const ECOMMERCE_FILE = join(process.cwd(), 'benchmarks/data/comparison/ecommerce/data.json')

console.log('📊 Benchmarking E-commerce Dataset (1 Record Only)\n')
console.log('='.repeat(60))

async function benchmark1Record() {
  // Create temp directory
  await mkdir(TEMP_DIR, { recursive: true })

  // Read original data and extract first record
  const originalData = JSON.parse(await readFile(ECOMMERCE_FILE, 'utf-8'))
  const oneRecordData = {
    products: [originalData.products[0]]
  }

  console.log('\n📝 Creating 1-record versions of all formats...\n')

  // Generate all formats
  const formats = {}

  // JSON
  const jsonContent = JSON.stringify(oneRecordData, null, 2)
  await writeFile(join(TEMP_DIR, 'data.json'), jsonContent, 'utf-8')
  formats.json = jsonContent

  // XML
  const xmlBuilder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    indentBy: '  '
  })
  const xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlBuilder.build(oneRecordData)
  await writeFile(join(TEMP_DIR, 'data.xml'), xmlContent, 'utf-8')
  formats.xml = xmlContent

  // YAML
  const yamlContent = yaml.stringify(oneRecordData)
  await writeFile(join(TEMP_DIR, 'data.yaml'), yamlContent, 'utf-8')
  formats.yaml = yamlContent

  // TOON (using indentation format)
  const toonContent = jsonToToon(oneRecordData)
  await writeFile(join(TEMP_DIR, 'data.toon'), toonContent, 'utf-8')
  formats.toon = toonContent

  // PLOON
  const ploonContent = stringify(oneRecordData)
  await writeFile(join(TEMP_DIR, 'data.ploon'), ploonContent, 'utf-8')
  formats.ploon = ploonContent

  // PLOON minified
  const ploonMinContent = minify(ploonContent)
  await writeFile(join(TEMP_DIR, 'data.min.ploon'), ploonMinContent, 'utf-8')
  formats['min.ploon'] = ploonMinContent

  console.log('✅ All formats generated\n')

  // Get tiktoken encoder for GPT-4/GPT-5
  const encoder = encoding_for_model('gpt-4')

  const results = {}

  // Calculate metrics for each format
  for (const [format, content] of Object.entries(formats)) {
    const buffer = Buffer.from(content, 'utf-8')
    const tokens = encoder.encode(content)

    results[format] = {
      chars: content.length,
      bytes: buffer.length,
      tokens: tokens.length
    }
  }

  // Display results
  console.log('📏 FILE SIZES (1 Record):\n')
  console.log(`   JSON:           ${results.json.chars.toLocaleString()} chars, ${results.json.bytes.toLocaleString()} bytes`)
  console.log(`   XML:            ${results.xml.chars.toLocaleString()} chars, ${results.xml.bytes.toLocaleString()} bytes`)
  console.log(`   YAML:           ${results.yaml.chars.toLocaleString()} chars, ${results.yaml.bytes.toLocaleString()} bytes`)
  console.log(`   TOON:           ${results.toon.chars.toLocaleString()} chars, ${results.toon.bytes.toLocaleString()} bytes`)
  console.log(`   PLOON:          ${results.ploon.chars.toLocaleString()} chars, ${results.ploon.bytes.toLocaleString()} bytes`)
  console.log(`   PLOON (min):    ${results['min.ploon'].chars.toLocaleString()} chars, ${results['min.ploon'].bytes.toLocaleString()} bytes`)

  console.log('\n🔢 TOKEN COUNTS (1 Record):\n')
  console.log(`   JSON:           ${results.json.tokens.toLocaleString()} tokens`)
  console.log(`   XML:            ${results.xml.tokens.toLocaleString()} tokens`)
  console.log(`   YAML:           ${results.yaml.tokens.toLocaleString()} tokens`)
  console.log(`   TOON:           ${results.toon.tokens.toLocaleString()} tokens`)
  console.log(`   PLOON:          ${results.ploon.tokens.toLocaleString()} tokens`)
  console.log(`   PLOON (min):    ${results['min.ploon'].tokens.toLocaleString()} tokens`)

  console.log('\n💰 SIZE SAVINGS (1 Record):\n')
  const jsonChars = results.json.chars
  const xmlChars = results.xml.chars
  const yamlChars = results.yaml.chars
  const toonChars = results.toon.chars
  const ploonChars = results.ploon.chars
  const ploonMinChars = results['min.ploon'].chars

  console.log('   PLOON (Standard):')
  console.log(`     vs JSON:      ${((jsonChars - ploonChars) / jsonChars * 100).toFixed(1)}% reduction  (${jsonChars - ploonChars} chars saved)`)
  console.log(`     vs XML:       ${((xmlChars - ploonChars) / xmlChars * 100).toFixed(1)}% reduction  (${xmlChars - ploonChars} chars saved)`)
  console.log(`     vs YAML:      ${((yamlChars - ploonChars) / yamlChars * 100).toFixed(1)}% reduction  (${yamlChars - ploonChars} chars saved)`)
  console.log(`     vs TOON:      ${((toonChars - ploonChars) / toonChars * 100).toFixed(1)}% reduction  (${toonChars - ploonChars} chars saved)`)

  console.log('\n   PLOON (Minified):')
  console.log(`     vs JSON:      ${((jsonChars - ploonMinChars) / jsonChars * 100).toFixed(1)}% reduction  (${jsonChars - ploonMinChars} chars saved)`)
  console.log(`     vs XML:       ${((xmlChars - ploonMinChars) / xmlChars * 100).toFixed(1)}% reduction  (${xmlChars - ploonMinChars} chars saved)`)
  console.log(`     vs YAML:      ${((yamlChars - ploonMinChars) / yamlChars * 100).toFixed(1)}% reduction  (${yamlChars - ploonMinChars} chars saved)`)
  console.log(`     vs TOON:      ${((toonChars - ploonMinChars) / toonChars * 100).toFixed(1)}% reduction  (${toonChars - ploonMinChars} chars saved)`)

  console.log('\n💎 TOKEN SAVINGS (1 Record):\n')
  const jsonTokens = results.json.tokens
  const xmlTokens = results.xml.tokens
  const yamlTokens = results.yaml.tokens
  const toonTokens = results.toon.tokens
  const ploonTokens = results.ploon.tokens
  const ploonMinTokens = results['min.ploon'].tokens

  console.log('   PLOON (Standard):')
  console.log(`     vs JSON:      ${((jsonTokens - ploonTokens) / jsonTokens * 100).toFixed(1)}% reduction  (${jsonTokens - ploonTokens} tokens saved)`)
  console.log(`     vs XML:       ${((xmlTokens - ploonTokens) / xmlTokens * 100).toFixed(1)}% reduction  (${xmlTokens - ploonTokens} tokens saved)`)
  console.log(`     vs YAML:      ${((yamlTokens - ploonTokens) / yamlTokens * 100).toFixed(1)}% reduction  (${yamlTokens - ploonTokens} tokens saved)`)
  console.log(`     vs TOON:      ${((toonTokens - ploonTokens) / toonTokens * 100).toFixed(1)}% reduction  (${toonTokens - ploonTokens} tokens saved)`)

  console.log('\n   PLOON (Minified):')
  console.log(`     vs JSON:      ${((jsonTokens - ploonMinTokens) / jsonTokens * 100).toFixed(1)}% reduction  (${jsonTokens - ploonMinTokens} tokens saved)`)
  console.log(`     vs XML:       ${((xmlTokens - ploonMinTokens) / xmlTokens * 100).toFixed(1)}% reduction  (${xmlTokens - ploonMinTokens} tokens saved)`)
  console.log(`     vs YAML:      ${((yamlTokens - ploonMinTokens) / yamlTokens * 100).toFixed(1)}% reduction  (${yamlTokens - ploonMinTokens} tokens saved)`)
  console.log(`     vs TOON:      ${((toonTokens - ploonMinTokens) / toonTokens * 100).toFixed(1)}% reduction  (${toonTokens - ploonMinTokens} tokens saved)`)

  console.log('\n' + '='.repeat(60))

  // Free encoder
  encoder.free()
}

// Simple TOON converter (indentation-based)
function jsonToToon(obj, indent = 0) {
  const spaces = '  '.repeat(indent)
  let result = []

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object' && item !== null) {
        result.push(jsonToToon(item, indent))
      } else {
        result.push(spaces + String(item))
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        result.push(spaces + key)
        result.push(jsonToToon(value, indent + 1))
      } else if (typeof value === 'object' && value !== null) {
        result.push(spaces + key)
        result.push(jsonToToon(value, indent + 1))
      } else {
        result.push(spaces + key + ' ' + String(value))
      }
    }
  } else {
    result.push(spaces + String(obj))
  }

  return result.join('\n')
}

benchmark1Record().catch(console.error)
