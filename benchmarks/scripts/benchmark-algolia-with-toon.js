#!/usr/bin/env node
/**
 * Benchmark Algolia dataset - JSON vs TOON vs PLOON
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { encoding_for_model } from 'tiktoken'
import { stringify, minify } from '../../packages/ploon/dist/index.js'

const ALGOLIA_FILE = join(process.cwd(), 'benchmarks/data/comparison/algolia/data.json')

console.log('📊 Benchmarking Algolia Dataset: JSON vs TOON vs PLOON\n')
console.log('='.repeat(60))

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

async function benchmarkAlgolia() {
  console.log('\n📝 Reading and converting...\n')

  // Read JSON
  const jsonContent = await readFile(ALGOLIA_FILE, 'utf-8')
  const data = JSON.parse(jsonContent)

  console.log('   ✓ JSON loaded')

  // Convert to TOON
  const toonContent = jsonToToon(data)
  console.log('   ✓ TOON generated')

  // Convert to PLOON
  const ploonContent = stringify(data)
  const ploonMinContent = minify(ploonContent)
  console.log('   ✓ PLOON generated')

  // Get tiktoken encoder
  const encoder = encoding_for_model('gpt-4')

  // Calculate metrics for JSON
  const jsonChars = jsonContent.length
  const jsonBytes = Buffer.from(jsonContent, 'utf-8').length
  const jsonTokens = encoder.encode(jsonContent).length

  // Calculate metrics for TOON
  const toonChars = toonContent.length
  const toonBytes = Buffer.from(toonContent, 'utf-8').length
  const toonTokens = encoder.encode(toonContent).length

  // Calculate metrics for PLOON
  const ploonChars = ploonContent.length
  const ploonBytes = Buffer.from(ploonContent, 'utf-8').length
  const ploonTokens = encoder.encode(ploonContent).length

  // Calculate metrics for PLOON (min)
  const ploonMinChars = ploonMinContent.length
  const ploonMinBytes = Buffer.from(ploonMinContent, 'utf-8').length
  const ploonMinTokens = encoder.encode(ploonMinContent).length

  // Display results
  console.log('\n📏 FILE SIZES:\n')
  console.log(`   JSON:           ${jsonChars.toLocaleString()} chars, ${jsonBytes.toLocaleString()} bytes`)
  console.log(`   TOON:           ${toonChars.toLocaleString()} chars, ${toonBytes.toLocaleString()} bytes`)
  console.log(`   PLOON:          ${ploonChars.toLocaleString()} chars, ${ploonBytes.toLocaleString()} bytes`)
  console.log(`   PLOON (min):    ${ploonMinChars.toLocaleString()} chars, ${ploonMinBytes.toLocaleString()} bytes`)

  console.log('\n🔢 TOKEN COUNTS:\n')
  console.log(`   JSON:           ${jsonTokens.toLocaleString()} tokens`)
  console.log(`   TOON:           ${toonTokens.toLocaleString()} tokens`)
  console.log(`   PLOON:          ${ploonTokens.toLocaleString()} tokens`)
  console.log(`   PLOON (min):    ${ploonMinTokens.toLocaleString()} tokens`)

  console.log('\n💰 CHARACTER SAVINGS:\n')
  console.log('   PLOON (Standard):')
  console.log(`     vs JSON:      ${((jsonChars - ploonChars) / jsonChars * 100).toFixed(1)}% reduction  (${(jsonChars - ploonChars).toLocaleString()} chars saved)`)
  console.log(`     vs TOON:      ${((toonChars - ploonChars) / toonChars * 100).toFixed(1)}% reduction  (${(toonChars - ploonChars).toLocaleString()} chars saved)`)

  console.log('\n   PLOON (Minified):')
  console.log(`     vs JSON:      ${((jsonChars - ploonMinChars) / jsonChars * 100).toFixed(1)}% reduction  (${(jsonChars - ploonMinChars).toLocaleString()} chars saved)`)
  console.log(`     vs TOON:      ${((toonChars - ploonMinChars) / toonChars * 100).toFixed(1)}% reduction  (${(toonChars - ploonMinChars).toLocaleString()} chars saved)`)

  console.log('\n💎 TOKEN SAVINGS:\n')
  console.log('   PLOON (Standard):')
  console.log(`     vs JSON:      ${((jsonTokens - ploonTokens) / jsonTokens * 100).toFixed(1)}% reduction  (${(jsonTokens - ploonTokens).toLocaleString()} tokens saved)`)
  console.log(`     vs TOON:      ${((toonTokens - ploonTokens) / toonTokens * 100).toFixed(1)}% reduction  (${(toonTokens - ploonTokens).toLocaleString()} tokens saved)`)

  console.log('\n   PLOON (Minified):')
  console.log(`     vs JSON:      ${((jsonTokens - ploonMinTokens) / jsonTokens * 100).toFixed(1)}% reduction  (${(jsonTokens - ploonMinTokens).toLocaleString()} tokens saved)`)
  console.log(`     vs TOON:      ${((toonTokens - ploonMinTokens) / toonTokens * 100).toFixed(1)}% reduction  (${(toonTokens - ploonMinTokens).toLocaleString()} tokens saved)`)

  console.log('\n' + '='.repeat(60))

  // Save files
  await writeFile(join(process.cwd(), 'benchmarks/data/comparison/algolia/data.toon'), toonContent, 'utf-8')
  await writeFile(join(process.cwd(), 'benchmarks/data/comparison/algolia/data.ploon'), ploonContent, 'utf-8')
  await writeFile(join(process.cwd(), 'benchmarks/data/comparison/algolia/data.min.ploon'), ploonMinContent, 'utf-8')
  console.log('\n✅ All files saved to algolia directory')

  // Free encoder
  encoder.free()
}

benchmarkAlgolia().catch(console.error)
