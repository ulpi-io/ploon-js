#!/usr/bin/env node
/**
 * Benchmark Round-Trip Accuracy
 * Test PLOON → Object → PLOON fidelity
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse, stringify } from '../../packages/ploon/dist/index.js'

const COMPARISON_DIR = join(process.cwd(), 'benchmarks/data/comparison')
const RESULTS_DIR = join(process.cwd(), 'benchmarks/results')

console.log('🔄 Benchmarking Round-Trip Accuracy\n')

function deepEqual(obj1, obj2, path = 'root') {
  if (obj1 === obj2) return { equal: true }

  if (obj1 == null || obj2 == null) {
    return { equal: false, path, reason: `null mismatch: ${obj1} vs ${obj2}` }
  }

  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return { equal: false, path, reason: `value mismatch: ${obj1} vs ${obj2}` }
  }

  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
    return { equal: false, path, reason: 'array/object type mismatch' }
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

  for (const key of keys1) {
    if (!keys2.includes(key)) {
      return { equal: false, path: `${path}.${key}`, reason: 'missing key' }
    }
    const result = deepEqual(obj1[key], obj2[key], `${path}.${key}`)
    if (!result.equal) return result
  }

  return { equal: true }
}

async function benchmarkRoundTrip() {
  const testCases = await readdir(COMPARISON_DIR)

  const results = {
    timestamp: new Date().toISOString(),
    testCases: {},
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  }

  for (const testCase of testCases) {
    const testDir = join(COMPARISON_DIR, testCase)

    console.log(`🔄 ${testCase}`)

    try {
      // Read original PLOON
      const ploonPath = join(testDir, 'data.ploon')
      const originalPloon = await readFile(ploonPath, 'utf-8')

      // Parse to object
      const parsedObj = parse(originalPloon)

      // Stringify back to PLOON
      const regeneratedPloon = stringify(parsedObj)

      // Parse both for deep comparison
      const originalObj = parse(originalPloon)
      const regeneratedObj = parse(regeneratedPloon)

      // Deep equality check
      const equalityResult = deepEqual(originalObj, regeneratedObj)

      // Character comparison
      const originalChars = originalPloon.trim().length
      const regeneratedChars = regeneratedPloon.trim().length
      const charDiff = Math.abs(originalChars - regeneratedChars)
      const charDiffPercent = originalChars > 0 ? (charDiff / originalChars * 100).toFixed(2) : '0.00'

      const testResult = {
        passed: equalityResult.equal,
        original_chars: originalChars,
        regenerated_chars: regeneratedChars,
        char_difference: charDiff,
        char_difference_percent: charDiffPercent + '%',
        data_equality: equalityResult.equal ? 'identical' : 'different'
      }

      if (!equalityResult.equal) {
        testResult.error_details = {
          path: equalityResult.path,
          reason: equalityResult.reason
        }
      }

      results.testCases[testCase] = testResult
      results.summary.total++

      if (equalityResult.equal) {
        results.summary.passed++
        console.log(`   ✅ PASS - Data identical`)
        console.log(`   📊 Original: ${originalChars} chars, Regenerated: ${regeneratedChars} chars`)
        if (charDiff > 0) {
          console.log(`   ℹ️  Character difference: ${charDiff} chars (${charDiffPercent}%) - formatting variation`)
        }
      } else {
        results.summary.failed++
        console.log(`   ❌ FAIL - Data mismatch`)
        console.log(`   🔍 Error at: ${equalityResult.path}`)
        console.log(`   📝 Reason: ${equalityResult.reason}`)
      }
      console.log()

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`)
      results.testCases[testCase] = {
        passed: false,
        error: error.message
      }
      results.summary.total++
      results.summary.failed++
    }
  }

  // Calculate pass rate
  results.summary.pass_rate = results.summary.total > 0
    ? ((results.summary.passed / results.summary.total) * 100).toFixed(1) + '%'
    : '0%'

  // Save results
  const date = new Date().toISOString().split('T')[0]
  const resultsPath = join(RESULTS_DIR, date, 'roundtrip.json')
  await writeFile(resultsPath, JSON.stringify(results, null, 2), 'utf-8')

  console.log('='.repeat(60))
  console.log('🔄 Round-Trip Summary:')
  console.log(`   Total tests: ${results.summary.total}`)
  console.log(`   Passed: ${results.summary.passed} ✅`)
  console.log(`   Failed: ${results.summary.failed} ❌`)
  console.log(`   Pass rate: ${results.summary.pass_rate}`)
  console.log(`\n✅ Results saved to: ${resultsPath}`)
}

benchmarkRoundTrip().catch(console.error)
