#!/usr/bin/env node
/**
 * Benchmark ecommerce dataset only
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { encoding_for_model } from 'tiktoken'

const ECOMMERCE_DIR = join(process.cwd(), 'benchmarks/data/comparison/ecommerce')

console.log('📊 Benchmarking E-commerce Dataset\n')
console.log('='.repeat(60))

async function benchmarkEcommerce() {
  const formats = ['json', 'xml', 'yaml', 'toon', 'ploon', 'min.ploon']
  const results = {}

  // Get tiktoken encoder for GPT-4/GPT-5
  const encoder = encoding_for_model('gpt-4')

  // Read all formats
  for (const format of formats) {
    const filePath = join(ECOMMERCE_DIR, `data.${format}`)
    try {
      const content = await readFile(filePath, 'utf-8')
      const buffer = Buffer.from(content, 'utf-8')

      // Calculate tokens using tiktoken (GPT-4/GPT-5 encoding)
      const tokens = encoder.encode(content)

      results[format] = {
        chars: content.length,
        bytes: buffer.length,
        tokens: tokens.length
      }
    } catch (err) {
      console.error(`❌ Missing ${format} file`)
      results[format] = { chars: 0, bytes: 0, tokens: 0 }
    }
  }

  // Display results
  console.log('\n📏 FILE SIZES:\n')
  console.log(`   JSON:           ${results.json.chars.toLocaleString()} chars, ${results.json.bytes.toLocaleString()} bytes`)
  console.log(`   XML:            ${results.xml.chars.toLocaleString()} chars, ${results.xml.bytes.toLocaleString()} bytes`)
  console.log(`   YAML:           ${results.yaml.chars.toLocaleString()} chars, ${results.yaml.bytes.toLocaleString()} bytes`)
  console.log(`   TOON:           ${results.toon.chars.toLocaleString()} chars, ${results.toon.bytes.toLocaleString()} bytes`)
  console.log(`   PLOON:          ${results.ploon.chars.toLocaleString()} chars, ${results.ploon.bytes.toLocaleString()} bytes`)
  console.log(`   PLOON (min):    ${results['min.ploon'].chars.toLocaleString()} chars, ${results['min.ploon'].bytes.toLocaleString()} bytes`)

  console.log('\n🔢 TOKEN COUNTS:\n')
  console.log(`   JSON:           ${results.json.tokens.toLocaleString()} tokens`)
  console.log(`   XML:            ${results.xml.tokens.toLocaleString()} tokens`)
  console.log(`   YAML:           ${results.yaml.tokens.toLocaleString()} tokens`)
  console.log(`   TOON:           ${results.toon.tokens.toLocaleString()} tokens`)
  console.log(`   PLOON:          ${results.ploon.tokens.toLocaleString()} tokens`)
  console.log(`   PLOON (min):    ${results['min.ploon'].tokens.toLocaleString()} tokens`)

  console.log('\n💰 SIZE SAVINGS:\n')
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

  console.log('\n💎 TOKEN SAVINGS:\n')
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

benchmarkEcommerce().catch(console.error)
