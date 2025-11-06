#!/usr/bin/env node
/**
 * Final Algolia benchmark - compare actual files
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { encoding_for_model } from 'tiktoken'

const ALGOLIA_DIR = join(process.cwd(), 'benchmarks/data/comparison/algolia')

console.log('📊 Algolia Dataset: JSON vs TOON vs PLOON\n')
console.log('='.repeat(60))

async function benchmark() {
  // Get tiktoken encoder
  const encoder = encoding_for_model('gpt-4')

  const formats = {
    json: await readFile(join(ALGOLIA_DIR, 'data.json'), 'utf-8'),
    toon: await readFile(join(ALGOLIA_DIR, 'data.toon'), 'utf-8'),
    ploon: await readFile(join(ALGOLIA_DIR, 'data.ploon'), 'utf-8'),
    'ploon-min': await readFile(join(ALGOLIA_DIR, 'data.min.ploon'), 'utf-8')
  }

  const results = {}

  for (const [format, content] of Object.entries(formats)) {
    results[format] = {
      chars: content.length,
      bytes: Buffer.from(content, 'utf-8').length,
      tokens: encoder.encode(content).length
    }
  }

  // Display results
  console.log('\n📏 FILE SIZES:\n')
  console.log(`   JSON:           ${results.json.chars.toLocaleString()} chars`)
  console.log(`   TOON:           ${results.toon.chars.toLocaleString()} chars`)
  console.log(`   PLOON:          ${results.ploon.chars.toLocaleString()} chars`)
  console.log(`   PLOON (min):    ${results['ploon-min'].chars.toLocaleString()} chars`)

  console.log('\n🔢 TOKEN COUNTS:\n')
  console.log(`   JSON:           ${results.json.tokens.toLocaleString()} tokens`)
  console.log(`   TOON:           ${results.toon.tokens.toLocaleString()} tokens`)
  console.log(`   PLOON:          ${results.ploon.tokens.toLocaleString()} tokens`)
  console.log(`   PLOON (min):    ${results['ploon-min'].tokens.toLocaleString()} tokens`)

  console.log('\n💰 CHARACTER SAVINGS:\n')
  const jsonChars = results.json.chars
  const toonChars = results.toon.chars
  const ploonChars = results.ploon.chars
  const ploonMinChars = results['ploon-min'].chars

  console.log('   PLOON (Standard):')
  console.log(`     vs JSON:      ${((jsonChars - ploonChars) / jsonChars * 100).toFixed(1)}% reduction  (${(jsonChars - ploonChars).toLocaleString()} chars saved)`)
  console.log(`     vs TOON:      ${((toonChars - ploonChars) / toonChars * 100).toFixed(1)}% reduction  (${(toonChars - ploonChars).toLocaleString()} chars saved)`)

  console.log('\n   PLOON (Minified):')
  console.log(`     vs JSON:      ${((jsonChars - ploonMinChars) / jsonChars * 100).toFixed(1)}% reduction  (${(jsonChars - ploonMinChars).toLocaleString()} chars saved)`)
  console.log(`     vs TOON:      ${((toonChars - ploonMinChars) / toonChars * 100).toFixed(1)}% reduction  (${(toonChars - ploonMinChars).toLocaleString()} chars saved)`)

  console.log('\n💎 TOKEN SAVINGS:\n')
  const jsonTokens = results.json.tokens
  const toonTokens = results.toon.tokens
  const ploonTokens = results.ploon.tokens
  const ploonMinTokens = results['ploon-min'].tokens

  console.log('   PLOON (Standard):')
  console.log(`     vs JSON:      ${((jsonTokens - ploonTokens) / jsonTokens * 100).toFixed(1)}% reduction  (${(jsonTokens - ploonTokens).toLocaleString()} tokens saved)`)
  console.log(`     vs TOON:      ${((toonTokens - ploonTokens) / toonTokens * 100).toFixed(1)}% reduction  (${(toonTokens - ploonTokens).toLocaleString()} tokens saved)`)

  console.log('\n   PLOON (Minified):')
  console.log(`     vs JSON:      ${((jsonTokens - ploonMinTokens) / jsonTokens * 100).toFixed(1)}% reduction  (${(jsonTokens - ploonMinTokens).toLocaleString()} tokens saved)`)
  console.log(`     vs TOON:      ${((toonTokens - ploonMinTokens) / toonTokens * 100).toFixed(1)}% reduction  (${(toonTokens - ploonMinTokens).toLocaleString()} tokens saved)`)

  console.log('\n' + '='.repeat(60))

  // Free encoder
  encoder.free()
}

benchmark().catch(console.error)
