#!/usr/bin/env node
/**
 * Benchmark Algolia dataset
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { encoding_for_model } from 'tiktoken'
import { stringify, minify } from '../../packages/ploon/dist/index.js'

const ALGOLIA_FILE = join(process.cwd(), 'benchmarks/data/comparison/algolia/data.json')

console.log('📊 Benchmarking Algolia Dataset\n')
console.log('='.repeat(60))

async function benchmarkAlgolia() {
  console.log('\n📝 Reading and converting JSON...\n')

  // Read JSON
  const jsonContent = await readFile(ALGOLIA_FILE, 'utf-8')
  const data = JSON.parse(jsonContent)

  console.log(`   Records found: ${Array.isArray(data) ? data.length : (data.products ? data.products.length : 'unknown')}`)

  // Convert to PLOON
  const ploonContent = stringify(data)
  const ploonMinContent = minify(ploonContent)

  // Get tiktoken encoder
  const encoder = encoding_for_model('gpt-4')

  // Calculate metrics
  const jsonChars = jsonContent.length
  const jsonBytes = Buffer.from(jsonContent, 'utf-8').length
  const jsonTokens = encoder.encode(jsonContent).length

  const ploonChars = ploonContent.length
  const ploonBytes = Buffer.from(ploonContent, 'utf-8').length
  const ploonTokens = encoder.encode(ploonContent).length

  const ploonMinChars = ploonMinContent.length
  const ploonMinBytes = Buffer.from(ploonMinContent, 'utf-8').length
  const ploonMinTokens = encoder.encode(ploonMinContent).length

  // Display results
  console.log('\n📏 FILE SIZES:\n')
  console.log(`   JSON:           ${jsonChars.toLocaleString()} chars, ${jsonBytes.toLocaleString()} bytes`)
  console.log(`   PLOON:          ${ploonChars.toLocaleString()} chars, ${ploonBytes.toLocaleString()} bytes`)
  console.log(`   PLOON (min):    ${ploonMinChars.toLocaleString()} chars, ${ploonMinBytes.toLocaleString()} bytes`)

  console.log('\n🔢 TOKEN COUNTS:\n')
  console.log(`   JSON:           ${jsonTokens.toLocaleString()} tokens`)
  console.log(`   PLOON:          ${ploonTokens.toLocaleString()} tokens`)
  console.log(`   PLOON (min):    ${ploonMinTokens.toLocaleString()} tokens`)

  console.log('\n💰 SIZE SAVINGS:\n')
  console.log('   PLOON (Standard):')
  console.log(`     vs JSON:      ${((jsonChars - ploonChars) / jsonChars * 100).toFixed(1)}% reduction  (${(jsonChars - ploonChars).toLocaleString()} chars saved)`)

  console.log('\n   PLOON (Minified):')
  console.log(`     vs JSON:      ${((jsonChars - ploonMinChars) / jsonChars * 100).toFixed(1)}% reduction  (${(jsonChars - ploonMinChars).toLocaleString()} chars saved)`)

  console.log('\n💎 TOKEN SAVINGS:\n')
  console.log('   PLOON (Standard):')
  console.log(`     vs JSON:      ${((jsonTokens - ploonTokens) / jsonTokens * 100).toFixed(1)}% reduction  (${(jsonTokens - ploonTokens).toLocaleString()} tokens saved)`)

  console.log('\n   PLOON (Minified):')
  console.log(`     vs JSON:      ${((jsonTokens - ploonMinTokens) / jsonTokens * 100).toFixed(1)}% reduction  (${(jsonTokens - ploonMinTokens).toLocaleString()} tokens saved)`)

  console.log('\n' + '='.repeat(60))

  // Save PLOON files
  await writeFile(join(process.cwd(), 'benchmarks/data/comparison/algolia/data.ploon'), ploonContent, 'utf-8')
  await writeFile(join(process.cwd(), 'benchmarks/data/comparison/algolia/data.min.ploon'), ploonMinContent, 'utf-8')
  console.log('\n✅ PLOON files saved to algolia directory')

  // Free encoder
  encoder.free()
}

benchmarkAlgolia().catch(console.error)
