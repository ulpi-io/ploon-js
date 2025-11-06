#!/usr/bin/env node
/**
 * Round-trip test for Algolia dataset
 * JSON → PLOON → JSON
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { stringify, parse } from '../../packages/ploon/dist/index.js'

const ALGOLIA_DIR = join(process.cwd(), 'benchmarks/data/comparison/algolia')

console.log('🔄 Algolia Dataset Round-Trip Test\n')
console.log('='.repeat(60))

async function roundTripTest() {
  console.log('\n📝 Step 1: Reading original JSON...\n')

  // Read original JSON
  const originalJson = await readFile(join(ALGOLIA_DIR, 'data.json'), 'utf-8')
  const originalData = JSON.parse(originalJson)

  console.log(`   ✓ Original JSON loaded (${originalJson.length.toLocaleString()} chars)`)

  console.log('\n📝 Step 2: Converting JSON → PLOON...\n')

  // Convert to PLOON
  const ploonContent = stringify(originalData)

  console.log(`   ✓ PLOON generated (${ploonContent.length.toLocaleString()} chars)`)
  console.log(`   ✓ Size reduction: ${((originalJson.length - ploonContent.length) / originalJson.length * 100).toFixed(1)}%`)

  console.log('\n📝 Step 3: Converting PLOON → JSON...\n')

  // Parse PLOON back to object
  const parsedData = parse(ploonContent)

  console.log(`   ✓ PLOON parsed back to object`)

  console.log('\n📝 Step 4: Comparing data structures...\n')

  // Deep equality check with path tracking
  function deepEqual(obj1, obj2, path = '') {
    if (obj1 === obj2) return { equal: true }
    if (obj1 == null || obj2 == null) {
      return { equal: false, path, reason: `null mismatch: ${obj1} vs ${obj2}` }
    }
    if (typeof obj1 !== typeof obj2) {
      return { equal: false, path, reason: `type mismatch: ${typeof obj1} vs ${typeof obj2}` }
    }
    if (typeof obj1 !== 'object') {
      return { equal: obj1 === obj2, path, reason: `value mismatch: ${obj1} vs ${obj2}` }
    }

    if (Array.isArray(obj1) !== Array.isArray(obj2)) {
      return { equal: false, path, reason: 'array vs object mismatch' }
    }

    if (Array.isArray(obj1)) {
      if (obj1.length !== obj2.length) {
        return { equal: false, path, reason: `array length: ${obj1.length} vs ${obj2.length}` }
      }
      for (let i = 0; i < obj1.length; i++) {
        const result = deepEqual(obj1[i], obj2[i], `${path}[${i}]`)
        if (!result.equal) return result
      }
      return { equal: true }
    }

    const keys1 = Object.keys(obj1).sort()
    const keys2 = Object.keys(obj2).sort()

    if (keys1.length !== keys2.length) {
      return { equal: false, path, reason: `key count: ${keys1.length} vs ${keys2.length}` }
    }
    if (keys1.join(',') !== keys2.join(',')) {
      const missing1 = keys2.filter(k => !keys1.includes(k))
      const missing2 = keys1.filter(k => !keys2.includes(k))
      return { equal: false, path, reason: `key mismatch. Missing in obj1: ${missing1.join(',')}. Missing in obj2: ${missing2.join(',')}` }
    }

    for (const key of keys1) {
      const result = deepEqual(obj1[key], obj2[key], `${path}.${key}`)
      if (!result.equal) return result
    }

    return { equal: true }
  }

  // Perform deep equality check
  const result = deepEqual(originalData, parsedData)

  if (result.equal) {
    console.log('   ✓ Deep equality check passed')
    console.log('\n✅ SUCCESS: Round-trip conversion is PERFECT!')
    console.log('   Original Data === PLOON → JSON Data')
    console.log('   All values and structure preserved!')
  } else {
    console.log('\n❌ FAILURE: Data mismatch detected')
    console.log(`   Path: ${result.path}`)
    console.log(`   Reason: ${result.reason}`)

    // Save for manual inspection
    const originalJsonNormalized = JSON.stringify(originalData, null, 2)
    const parsedJsonNormalized = JSON.stringify(parsedData, null, 2)
    await writeFile(join(ALGOLIA_DIR, 'data-original.json'), originalJsonNormalized, 'utf-8')
    await writeFile(join(ALGOLIA_DIR, 'data-roundtrip.json'), parsedJsonNormalized, 'utf-8')
    console.log('   ✓ Debug files saved for inspection')
  }

  console.log('\n' + '='.repeat(60))

  return result.equal
}

roundTripTest()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(err => {
    console.error('\n❌ ERROR:', err.message)
    console.error(err.stack)
    process.exit(1)
  })
